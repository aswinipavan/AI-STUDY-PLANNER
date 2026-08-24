package com.aistudyplanner;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Verifies the LOCAL data-persistence fix end to end at the persistence layer.
 *
 * <p>The local profile was changed from an in-memory H2 database ({@code jdbc:h2:mem:}) to a
 * file-based one ({@code jdbc:h2:file:}). This test proves the behaviour the requirement asks for:
 * data created before the backend stops is still present after it restarts, and the student is
 * re-attached to their existing records by their real Firebase UID on re-login.
 *
 * <p>It uses the <b>real</b> {@code schema-local.sql} (via {@code RUNSCRIPT}, exactly what
 * {@code spring.sql.init} runs on boot) and the <b>real</b> file-based URL flags from
 * {@code application-local.properties}. A genuine restart is simulated by executing {@code SHUTDOWN}
 * (closing and flushing the file DB) and then opening a fresh connection to the same file. No Spring
 * context, Firebase, or secrets are required — only the persistence strategy that actually changed.
 */
class LocalPersistenceVerificationTest {

    /** Identical flags to spring.datasource.url in application-local.properties (only mem: -> file:). */
    private static final String FLAGS =
            ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=false;NON_KEYWORDS=VALUE";

    /** Stands in for a real Google/Firebase account UID — AuthService keys students on exactly this. */
    private static final String STUDENT_UID = "google-oauth2|verify-persistence-user";

    private Path workDir;
    private Path schemaFile;
    private String url;

    @BeforeEach
    void setUp() throws Exception {
        workDir = Files.createTempDirectory("persistence-verify-");
        // Copy the real schema so RUNSCRIPT executes exactly what the app runs on startup.
        try (InputStream in = getClass().getResourceAsStream("/schema-local.sql")) {
            assertNotNull(in, "schema-local.sql must be on the test classpath");
            schemaFile = workDir.resolve("schema-local.sql");
            Files.write(schemaFile, in.readAllBytes());
        }
        url = "jdbc:h2:file:" + workDir.resolve("studyplanner").toAbsolutePath() + FLAGS;
    }

    @AfterEach
    void tearDown() throws Exception {
        try (Connection c = connect(); Statement s = c.createStatement()) {
            s.execute("SHUTDOWN");
        } catch (SQLException ignored) {
            // DB may already be shut down by the test itself.
        }
        if (workDir != null && Files.exists(workDir)) {
            try (var walk = Files.walk(workDir)) {
                walk.sorted(Comparator.reverseOrder()).forEach(p -> {
                    try {
                        Files.deleteIfExists(p);
                    } catch (IOException ignored) {
                        // best-effort cleanup of a temp dir
                    }
                });
            }
        }
    }

    @Test
    void localData_survivesBackendRestart_andReattachesByFirebaseUid() throws Exception {
        UUID studentId = UUID.randomUUID();
        UUID subjectId = UUID.randomUUID();
        UUID timetableId = UUID.randomUUID();

        // A real uploaded material file on disk. Its DB metadata must stay consistent with the file.
        Path uploads = workDir.resolve("uploads");
        Files.createDirectories(uploads);
        Path materialFile = uploads.resolve("dsa-notes.pdf");
        Files.write(materialFile, "PDF-CONTENT".getBytes(StandardCharsets.UTF_8));
        String fileUrl = materialFile.toAbsolutePath().toString();

        // ---------- SESSION 1: first boot — the student logs in and creates data ----------
        try (Connection c = connect()) {
            runStartupSchema(c);
            insertStudent(c, studentId, STUDENT_UID);
            insertSubject(c, subjectId, studentId, "Data Structures");
            insertMark(c, studentId, subjectId, 78.5);
            insertExam(c, studentId, subjectId, LocalDate.now().plusDays(30));
            insertTimetable(c, timetableId, studentId);
            insertTimetableSlot(c, timetableId, subjectId, "Revision: Balanced Trees");
            insertMaterial(c, studentId, subjectId, "DSA Notes", materialFile.getFileName().toString(), fileUrl);
            insertChat(c, studentId, "session-1", "How should I revise trees?");
            insertSnapshot(c, studentId, 78.5);

            assertEquals(1, count(c, "students", "firebase_uid = ?", STUDENT_UID),
                    "sanity: the student exists in the live session before restart");

            shutdown(c); // graceful shutdown == the backend process stopping
        }

        // ---------- SESSION 2: the backend has restarted — the student logs in again ----------
        try (Connection c = connect()) {
            // Startup runs schema-local.sql AGAIN against the now-populated file DB. With the old
            // in-memory DB this was a fresh table every time; against a persistent DB it must be
            // idempotent (CREATE ... IF NOT EXISTS + insert-once seed) and must NOT throw or reset data.
            runStartupSchema(c);

            // Re-login path: AuthService/FirebaseTokenFilter resolve the student by Firebase UID.
            UUID reFoundId = findStudentIdByUid(c, STUDENT_UID);
            assertEquals(studentId, reFoundId,
                    "The same Firebase UID must resolve to the SAME student row after a restart");

            // Every data category the requirement lists must still be present and linked to the student.
            assertEquals(1, count(c, "subjects", "student_id = ?", studentId), "subjects must survive restart");
            assertEquals(1, count(c, "marks", "student_id = ?", studentId), "marks must survive restart");
            assertEquals(1, count(c, "exams", "student_id = ?", studentId), "exams must survive restart");
            assertEquals(1, count(c, "timetables", "student_id = ?", studentId), "timetable must survive restart");
            assertEquals(1, count(c, "timetable_slots", "timetable_id = ?", timetableId),
                    "timetable slots must survive restart");
            assertEquals(1, count(c, "chat_history", "student_id = ?", studentId), "chat history must survive restart");
            assertEquals(1, count(c, "performance_snapshots", "student_id = ?", studentId),
                    "progress snapshots must survive restart");

            // Material metadata survived AND still points at the real file on disk (files + metadata consistent).
            String persistedUrl = queryString(c, "SELECT file_url FROM materials WHERE student_id = ?", studentId);
            assertEquals(fileUrl, persistedUrl, "material metadata must survive restart");
            assertTrue(Files.exists(Paths.get(persistedUrl)),
                    "the material file the metadata points to must still exist on disk after restart");
            assertEquals("PDF-CONTENT", Files.readString(Paths.get(persistedUrl)),
                    "the material file content must be unchanged after restart");

            // The demo seed must be insert-once: exactly one faculty-demo-uid row despite two schema runs.
            assertEquals(1, count(c, "students", "firebase_uid = ?", "faculty-demo-uid"),
                    "demo seed must be inserted once — never duplicated or reset across restarts");

            shutdown(c);
        }
    }

    // ----------------------------------------------------------------------------------------------
    // helpers
    // ----------------------------------------------------------------------------------------------

    private Connection connect() throws SQLException {
        return DriverManager.getConnection(url, "sa", "");
    }

    private void shutdown(Connection c) throws SQLException {
        try (Statement s = c.createStatement()) {
            s.execute("SHUTDOWN");
        }
    }

    /** Runs the exact schema script the local profile initialises with on every boot. */
    private void runStartupSchema(Connection c) throws SQLException {
        String path = schemaFile.toAbsolutePath().toString().replace('\\', '/');
        try (Statement s = c.createStatement()) {
            s.execute("RUNSCRIPT FROM '" + path + "'");
        }
    }

    private void insertStudent(Connection c, UUID id, String uid) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "INSERT INTO students (id, firebase_uid, full_name, email) VALUES (?,?,?,?)")) {
            ps.setObject(1, id);
            ps.setString(2, uid);
            ps.setString(3, "Verify Persistence User");
            ps.setString(4, "verify.persistence@example.edu");
            ps.executeUpdate();
        }
    }

    private void insertSubject(Connection c, UUID id, UUID studentId, String name) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "INSERT INTO subjects (id, student_id, subject_name, difficulty_level) VALUES (?,?,?,?)")) {
            ps.setObject(1, id);
            ps.setObject(2, studentId);
            ps.setString(3, name);
            ps.setInt(4, 3);
            ps.executeUpdate();
        }
    }

    private void insertMark(Connection c, UUID studentId, UUID subjectId, double pct) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "INSERT INTO marks (id, student_id, subject_id, exam_type, marks_obtained, total_marks, percentage, exam_date) "
                        + "VALUES (?,?,?,?,?,?,?,?)")) {
            ps.setObject(1, UUID.randomUUID());
            ps.setObject(2, studentId);
            ps.setObject(3, subjectId);
            ps.setString(4, "MIDTERM");
            ps.setBigDecimal(5, new java.math.BigDecimal("78.50"));
            ps.setBigDecimal(6, new java.math.BigDecimal("100.00"));
            ps.setBigDecimal(7, new java.math.BigDecimal(String.valueOf(pct)));
            ps.setObject(8, LocalDate.now().minusDays(7));
            ps.executeUpdate();
        }
    }

    private void insertExam(Connection c, UUID studentId, UUID subjectId, LocalDate date) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "INSERT INTO exams (id, student_id, subject_id, exam_name, exam_date, difficulty) VALUES (?,?,?,?,?,?)")) {
            ps.setObject(1, UUID.randomUUID());
            ps.setObject(2, studentId);
            ps.setObject(3, subjectId);
            ps.setString(4, "Final Exam");
            ps.setObject(5, date);
            ps.setString(6, "medium");
            ps.executeUpdate();
        }
    }

    private void insertTimetable(Connection c, UUID id, UUID studentId) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "INSERT INTO timetables (id, student_id, title, week_start_date, is_active) VALUES (?,?,?,?,?)")) {
            ps.setObject(1, id);
            ps.setObject(2, studentId);
            ps.setString(3, "Study Plan");
            ps.setObject(4, LocalDate.now());
            ps.setBoolean(5, true);
            ps.executeUpdate();
        }
    }

    private void insertTimetableSlot(Connection c, UUID timetableId, UUID subjectId, String topic) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "INSERT INTO timetable_slots (id, timetable_id, subject_id, slot_date, start_time, end_time, topic) "
                        + "VALUES (?,?,?,?,?,?,?)")) {
            ps.setObject(1, UUID.randomUUID());
            ps.setObject(2, timetableId);
            ps.setObject(3, subjectId);
            ps.setObject(4, LocalDate.now());
            ps.setObject(5, java.time.LocalTime.of(17, 0));
            ps.setObject(6, java.time.LocalTime.of(18, 0));
            ps.setString(7, topic);
            ps.executeUpdate();
        }
    }

    private void insertMaterial(Connection c, UUID studentId, UUID subjectId, String title, String fileName, String fileUrl)
            throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "INSERT INTO materials (id, student_id, subject_id, title, file_name, file_url, file_type, processing_status) "
                        + "VALUES (?,?,?,?,?,?,?,?)")) {
            ps.setObject(1, UUID.randomUUID());
            ps.setObject(2, studentId);
            ps.setObject(3, subjectId);
            ps.setString(4, title);
            ps.setString(5, fileName);
            ps.setString(6, fileUrl);
            ps.setString(7, "pdf");
            ps.setString(8, "COMPLETED");
            ps.executeUpdate();
        }
    }

    private void insertChat(Connection c, UUID studentId, String sessionId, String message) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "INSERT INTO chat_history (id, student_id, session_id, role, message) VALUES (?,?,?,?,?)")) {
            ps.setObject(1, UUID.randomUUID());
            ps.setObject(2, studentId);
            ps.setString(3, sessionId);
            ps.setString(4, "user");
            ps.setString(5, message);
            ps.executeUpdate();
        }
    }

    private void insertSnapshot(Connection c, UUID studentId, double pct) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "INSERT INTO performance_snapshots (id, student_id, snapshot_date, overall_percentage) VALUES (?,?,?,?)")) {
            ps.setObject(1, UUID.randomUUID());
            ps.setObject(2, studentId);
            ps.setObject(3, LocalDate.now());
            ps.setBigDecimal(4, new java.math.BigDecimal(String.valueOf(pct)));
            ps.executeUpdate();
        }
    }

    private int count(Connection c, String table, String where, Object param) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement("SELECT COUNT(*) FROM " + table + " WHERE " + where)) {
            ps.setObject(1, param);
            try (ResultSet rs = ps.executeQuery()) {
                rs.next();
                return rs.getInt(1);
            }
        }
    }

    private UUID findStudentIdByUid(Connection c, String uid) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement("SELECT id FROM students WHERE firebase_uid = ?")) {
            ps.setString(1, uid);
            try (ResultSet rs = ps.executeQuery()) {
                assertTrue(rs.next(), "student must be found by Firebase UID after restart");
                return (UUID) rs.getObject(1);
            }
        }
    }

    private String queryString(Connection c, String sql, Object param) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setObject(1, param);
            try (ResultSet rs = ps.executeQuery()) {
                assertTrue(rs.next(), "expected a row for: " + sql);
                return rs.getString(1);
            }
        }
    }
}
