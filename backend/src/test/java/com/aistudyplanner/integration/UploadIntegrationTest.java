package com.aistudyplanner.integration;

import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.repository.StudentRepository;
import com.aistudyplanner.security.JwtTokenProvider;
import com.aistudyplanner.service.nlp.DocumentIntelligenceService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * End-to-end integration test for the file-upload chain built to fix the HTTP 400 upload failures.
 *
 * <p>Unlike {@code MaterialControllerTest} (a {@code @WebMvcTest} with the service mocked), this test
 * boots the full application on a random port and exercises the <em>real</em> chain over HTTP:
 * <pre>
 *   multipart POST → controller → MaterialService/StudentController → StorageService (local FS)
 *                  → persisted /api/files/... URL → FileController serves the exact bytes back
 * </pre>
 *
 * <p>Authentication uses a genuine application JWT (the same {@link JwtTokenProvider} the login flow
 * uses); the real {@code FirebaseTokenFilter} validates it and loads the persisted {@link Student},
 * so no Firebase mocking or bypass is involved. Storage is redirected to a throwaway temp directory,
 * mirroring the local profile where Supabase is not configured.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@TestPropertySource(locations = "classpath:application-test.properties")
@DisplayName("Upload chain integration (materials + avatar) — local filesystem storage")
class UploadIntegrationTest {

    private static Path storageDir;

    @DynamicPropertySource
    static void storageProperties(DynamicPropertyRegistry registry) throws IOException {
        storageDir = Files.createTempDirectory("aisp-it-uploads");
        registry.add("storage.local.dir", () -> storageDir.toString());
        // Force the local-filesystem storage branch deterministically, regardless of any Supabase
        // credentials present in the ambient environment. This keeps the test hermetic (no network,
        // no writes to a real Supabase bucket) and exercises exactly the code path the LOCAL profile
        // uses. The production Supabase branch is covered by StorageServiceTest.
        registry.add("supabase.url", () -> "");
        registry.add("supabase.service-role-key", () -> "");
        registry.add("supabase.anon-key", () -> "");
    }

    @AfterAll
    static void cleanUpStorage() throws IOException {
        if (storageDir != null && Files.exists(storageDir)) {
            try (var paths = Files.walk(storageDir)) {
                paths.sorted(Comparator.reverseOrder()).forEach(p -> {
                    try {
                        Files.deleteIfExists(p);
                    } catch (IOException ignored) {
                        // best-effort cleanup of a temp directory
                    }
                });
            }
        }
    }

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private ObjectMapper objectMapper;

    // Isolate the upload/storage flow from the asynchronous AI document pipeline (network-bound).
    @MockBean
    private DocumentIntelligenceService documentIntelligenceService;

    /** Persist a real student and mint a valid app JWT for it, exactly as the login flow would. */
    private Student authenticatedStudent() {
        Student student = studentRepository.save(Student.builder()
                .firebaseUid("it-uid-" + UUID.randomUUID())
                .email("it-" + UUID.randomUUID() + "@example.com")
                .fullName("Integration Test User")
                .build());
        return student;
    }

    private HttpHeaders bearer(Student student) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwtTokenProvider.generateToken(student.getId(), student.getFirebaseUid()));
        return headers;
    }

    @Test
    @DisplayName("Uploads a PDF, persists it locally, and serves back the exact bytes uncorrupted")
    void materialUploadRoundTrip() {
        Student student = authenticatedStudent();

        // Binary-ish payload with bytes outside the ASCII range: a UTF-8-decoding proxy (the old bug)
        // would corrupt these; ArrayBuffer forwarding preserves them.
        byte[] pdfBytes = new byte[512];
        for (int i = 0; i < pdfBytes.length; i++) {
            pdfBytes[i] = (byte) (i % 256);
        }
        byte[] header = "%PDF-1.4\n".getBytes(StandardCharsets.US_ASCII);
        System.arraycopy(header, 0, pdfBytes, 0, header.length);

        ByteArrayResource fileResource = new ByteArrayResource(pdfBytes) {
            @Override
            public String getFilename() {
                return "lecture notes final.pdf"; // space forces sanitisation
            }
        };

        // Set the part Content-Type as a browser does for a real File.
        HttpHeaders partHeaders = new HttpHeaders();
        partHeaders.setContentType(MediaType.APPLICATION_PDF);
        HttpEntity<ByteArrayResource> filePart = new HttpEntity<>(fileResource, partHeaders);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", filePart);
        body.add("title", "Lecture Notes");

        HttpHeaders headers = bearer(student);
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        ResponseEntity<String> upload = restTemplate.postForEntity(
                "/api/materials/upload", new HttpEntity<>(body, headers), String.class);

        assertThat(upload.getStatusCode().value()).as("upload status").isEqualTo(201);

        JsonNode data = readData(upload.getBody());
        String fileUrl = data.path("fileUrl").asText();
        assertThat(fileUrl).startsWith("/api/files/materials/" + student.getId() + "/");
        assertThat(fileUrl).endsWith("_lecture_notes_final.pdf"); // space → underscore
        assertThat(data.path("fileType").asText()).isEqualTo("application/pdf");
        assertThat(data.path("materialType").asText()).isEqualTo("PDF");
        assertThat(data.path("processingStatus").asText()).isEqualTo("PENDING");

        // The bytes must exist on disk under the temp storage root.
        Path onDisk = storageDir.resolve(fileUrl.substring("/api/files/".length()));
        assertThat(Files.exists(onDisk)).as("file written to local storage").isTrue();

        // Fetch it back through FileController (authenticated, like the browser via the proxy).
        ResponseEntity<byte[]> fetched = restTemplate.exchange(
                fileUrl, HttpMethod.GET, new HttpEntity<>(bearer(student)), byte[].class);

        assertThat(fetched.getStatusCode().value()).as("file fetch status").isEqualTo(200);
        assertThat(fetched.getBody()).as("served bytes match uploaded bytes").isEqualTo(pdfBytes);
        assertThat(fetched.getHeaders().getContentType()).isEqualTo(MediaType.APPLICATION_PDF);
    }

    @Test
    @DisplayName("Uploads an avatar, cache-busts the stored URL, and serves the image back")
    void avatarUploadRoundTrip() {
        Student student = authenticatedStudent();

        byte[] pngBytes = new byte[256];
        // PNG magic number so the payload is a plausible image.
        byte[] magic = new byte[] {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
        System.arraycopy(magic, 0, pngBytes, 0, magic.length);
        for (int i = magic.length; i < pngBytes.length; i++) {
            pngBytes[i] = (byte) (255 - (i % 256));
        }

        ByteArrayResource fileResource = new ByteArrayResource(pngBytes) {
            @Override
            public String getFilename() {
                return "profile.png";
            }
        };
        HttpHeaders partHeaders = new HttpHeaders();
        partHeaders.setContentType(MediaType.IMAGE_PNG);
        HttpEntity<ByteArrayResource> filePart = new HttpEntity<>(fileResource, partHeaders);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", filePart);

        HttpHeaders headers = bearer(student);
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        ResponseEntity<String> upload = restTemplate.postForEntity(
                "/api/students/me/avatar", new HttpEntity<>(body, headers), String.class);

        assertThat(upload.getStatusCode().value()).as("avatar upload status").isEqualTo(200);

        JsonNode data = readData(upload.getBody());
        String pictureUrl = data.path("profilePictureUrl").asText();
        assertThat(pictureUrl).startsWith("/api/files/avatars/" + student.getId() + "/avatar.png");
        assertThat(pictureUrl).contains("?v="); // cache-busting query for the stable object path

        // FileController serves on the path only; the ?v= query is ignored.
        ResponseEntity<byte[]> fetched = restTemplate.exchange(
                pictureUrl, HttpMethod.GET, new HttpEntity<>(bearer(student)), byte[].class);

        assertThat(fetched.getStatusCode().value()).as("avatar fetch status").isEqualTo(200);
        assertThat(fetched.getBody()).as("served avatar bytes match uploaded bytes").isEqualTo(pngBytes);
        assertThat(fetched.getHeaders().getContentType()).isEqualTo(MediaType.IMAGE_PNG);
    }

    @Test
    @DisplayName("Rejects an unauthenticated upload (auth is enforced, not bypassed)")
    void uploadRequiresAuthentication() {
        ByteArrayResource fileResource = new ByteArrayResource("data".getBytes(StandardCharsets.UTF_8)) {
            @Override
            public String getFilename() {
                return "note.txt";
            }
        };
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", fileResource);
        body.add("title", "No Auth");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        ResponseEntity<String> upload = restTemplate.postForEntity(
                "/api/materials/upload", new HttpEntity<>(body, headers), String.class);

        // Either 401 (Unauthorized) or 403 (Forbidden) proves auth is enforced; the request never
        // reaches the controller. The exact code depends on Spring Security's default entry point.
        assertThat(upload.getStatusCode().value()).isIn(401, 403);
    }

    private JsonNode readData(String responseBody) {
        try {
            return objectMapper.readTree(responseBody).path("data");
        } catch (IOException e) {
            throw new AssertionError("Response was not valid JSON: " + responseBody, e);
        }
    }
}
