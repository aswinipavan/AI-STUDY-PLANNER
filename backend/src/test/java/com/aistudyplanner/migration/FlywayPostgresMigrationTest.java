package com.aistudyplanner.migration;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.output.MigrateResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Runs the real migration scripts against a real PostgreSQL server.
 *
 * <p>The rest of the suite uses H2 with {@code spring.flyway.enabled=false}, so nothing else
 * exercises these scripts on the engine they actually target. That gap is why the production
 * deploy was the first place to discover that V3's bare {@code CREATE POLICY} statements are
 * not re-runnable — PostgreSQL has no {@code CREATE POLICY ... IF NOT EXISTS}.
 *
 * <p>Skipped automatically when no Docker daemon is reachable ({@code disabledWithoutDocker}),
 * so it never breaks a developer machine without Docker.
 */
@Testcontainers(disabledWithoutDocker = true)
@DisplayName("Flyway migrations against a real PostgreSQL server")
class FlywayPostgresMigrationTest {

    /** V1..V6. */
    private static final int MIGRATION_COUNT = 6;

    /** policyname -> "table|command|USING expression", exactly as V3 defines them. */
    private static final Map<String, String> INTENDED_STUDY_TOGETHER_POLICIES = Map.of(
            "Study room read access", "study_rooms|SELECT|true",
            "Study room participant access", "study_room_participants|ALL|true",
            "Study room messages access", "study_room_messages|ALL|true");

    @Container
    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>(DockerImageName.parse("postgres:15-alpine"));

    @BeforeEach
    void resetToEmptyDatabase() throws SQLException {
        exec("DROP SCHEMA IF EXISTS public CASCADE",
                "CREATE SCHEMA public",
                // Supabase provides auth.uid(); V1's RLS policies reference it. Stubbing it lets a
                // vanilla PostgreSQL image run the production migration scripts completely unmodified.
                "DROP SCHEMA IF EXISTS auth CASCADE",
                "CREATE SCHEMA auth",
                "CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$");
    }

    @Test
    @DisplayName("fresh database: every migration applies and the Study Together policies land as defined")
    void freshDatabaseAppliesEveryMigration() throws SQLException {
        MigrateResult result = flyway().migrate();

        assertThat(result.success).isTrue();
        assertThat(result.migrationsExecuted).isEqualTo(MIGRATION_COUNT);
        assertStudyTogetherSecurityIntact();
    }

    @Test
    @DisplayName("production scenario: V3 re-runs over pre-existing tables and policies without failing")
    void v3SucceedsWhenPoliciesAlreadyExist() throws SQLException {
        // 1. Build the schema, including the Study Together tables and their policies.
        flyway().migrate();

        // 2. Then forget that Flyway ever ran. This is the production state: the Study Together
        //    objects were created directly in Supabase during development, so the objects exist
        //    but no history row does. baselineOnMigrate=true (as in application.properties) then
        //    baselines the non-empty schema at v1 and applies V2..V6 on top — which is exactly
        //    what made V3's bare CREATE POLICY fail on Render.
        exec("DROP TABLE flyway_schema_history");

        MigrateResult result = flyway().migrate();

        assertThat(result.success).isTrue();
        // V1 is covered by the baseline; V2..V6 are applied against objects that already exist.
        assertThat(result.migrationsExecuted).isEqualTo(MIGRATION_COUNT - 1);
        assertStudyTogetherSecurityIntact();
    }

    @Test
    @DisplayName("repeated re-runs stay clean and never duplicate or drop a policy")
    void repeatedRerunsRemainIdempotent() throws SQLException {
        flyway().migrate();

        for (int attempt = 1; attempt <= 3; attempt++) {
            exec("DROP TABLE flyway_schema_history");
            assertThat(flyway().migrate().success).as("re-run #%d", attempt).isTrue();
            assertStudyTogetherSecurityIntact();
        }
    }

    /**
     * Asserts the Study Together tables still carry exactly the three intended policies — same
     * names, same commands, same USING expressions, no duplicates — and that RLS is still on.
     */
    private void assertStudyTogetherSecurityIntact() throws SQLException {
        Map<String, String> actual = new LinkedHashMap<>();
        try (Connection c = connection();
             Statement s = c.createStatement();
             ResultSet rs = s.executeQuery(
                     "SELECT policyname, tablename, cmd, qual FROM pg_policies "
                             + "WHERE schemaname = 'public' AND tablename LIKE 'study_room%' "
                             + "ORDER BY tablename, policyname")) {
            while (rs.next()) {
                actual.put(rs.getString("policyname"),
                        rs.getString("tablename") + "|" + rs.getString("cmd") + "|" + rs.getString("qual"));
            }
        }
        assertThat(actual)
                .as("Study Together policies must survive re-runs unchanged")
                .containsExactlyInAnyOrderEntriesOf(INTENDED_STUDY_TOGETHER_POLICIES);

        try (Connection c = connection();
             Statement s = c.createStatement();
             ResultSet rs = s.executeQuery(
                     "SELECT relname, relrowsecurity FROM pg_class c "
                             + "JOIN pg_namespace n ON n.oid = c.relnamespace "
                             + "WHERE n.nspname = 'public' AND relkind = 'r' AND relname LIKE 'study_room%'")) {
            int tables = 0;
            while (rs.next()) {
                assertThat(rs.getBoolean("relrowsecurity"))
                        .as("row level security enabled on %s", rs.getString("relname")).isTrue();
                tables++;
            }
            assertThat(tables).as("study_room* tables present").isEqualTo(3);
        }
    }

    /** Configured to match production: same script location, same baseline-on-migrate behaviour. */
    private static Flyway flyway() {
        return Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration")
                .baselineOnMigrate(true)
                .load();
    }

    private static Connection connection() throws SQLException {
        return DriverManager.getConnection(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
    }

    private static void exec(String... statements) throws SQLException {
        try (Connection c = connection(); Statement s = c.createStatement()) {
            for (String sql : statements) {
                s.execute(sql);
            }
        }
    }
}
