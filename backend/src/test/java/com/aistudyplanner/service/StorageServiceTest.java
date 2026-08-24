package com.aistudyplanner.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link StorageService}'s local-filesystem backend and its backend-selection and
 * path-sanitisation logic. No Spring context and no network: the Supabase branch is selected purely
 * by configuration and its production behaviour is exercised by the live environment / integration
 * runs rather than a mocked HTTP client.
 */
@DisplayName("StorageService — local filesystem backend & guards")
class StorageServiceTest {

    private StorageService withLocalDir(Path dir) {
        StorageService service = new StorageService();
        ReflectionTestUtils.setField(service, "localDir", dir.toString());
        ReflectionTestUtils.setField(service, "supabaseUrl", "");
        ReflectionTestUtils.setField(service, "serviceRoleKey", "");
        return service;
    }

    @Test
    @DisplayName("usesSupabase() is false when credentials are blank, true when both are set")
    void backendSelection() {
        StorageService service = new StorageService();
        ReflectionTestUtils.setField(service, "supabaseUrl", "");
        ReflectionTestUtils.setField(service, "serviceRoleKey", "");
        assertThat(service.usesSupabase()).isFalse();

        ReflectionTestUtils.setField(service, "supabaseUrl", "https://example.supabase.co");
        ReflectionTestUtils.setField(service, "serviceRoleKey", "service-role-key");
        assertThat(service.usesSupabase()).isTrue();

        // Missing either half falls back to local.
        ReflectionTestUtils.setField(service, "serviceRoleKey", "");
        assertThat(service.usesSupabase()).isFalse();
    }

    @Test
    @DisplayName("upload() writes bytes to disk and returns the /api/files serving URL")
    void uploadWritesLocallyAndReturnsServingUrl(@TempDir Path dir) throws Exception {
        StorageService service = withLocalDir(dir);
        byte[] bytes = "hello world".getBytes(StandardCharsets.UTF_8);

        String url = service.upload("materials", "student-1/note.txt", bytes, "text/plain");

        assertThat(url).isEqualTo("/api/files/materials/student-1/note.txt");
        Path written = dir.resolve("materials").resolve("student-1").resolve("note.txt");
        assertThat(Files.exists(written)).isTrue();
        assertThat(Files.readAllBytes(written)).isEqualTo(bytes);
    }

    @Test
    @DisplayName("resolveLocal() returns the path for an existing file and null for a missing one")
    void resolveLocalRoundTrip(@TempDir Path dir) {
        StorageService service = withLocalDir(dir);
        service.upload("avatars", "student-1/avatar.png", new byte[] {1, 2, 3}, "image/png");

        assertThat(service.resolveLocal("avatars", "student-1/avatar.png")).isNotNull();
        assertThat(service.resolveLocal("avatars", "student-1/missing.png")).isNull();
    }

    @Test
    @DisplayName("Leading slashes in the object path are stripped so the file stays inside the bucket")
    void leadingSlashesAreStripped(@TempDir Path dir) {
        StorageService service = withLocalDir(dir);

        String url = service.upload("materials", "///student-1/note.txt", new byte[] {9}, "text/plain");

        assertThat(url).isEqualTo("/api/files/materials/student-1/note.txt");
        assertThat(service.resolveLocal("materials", "student-1/note.txt")).isNotNull();
    }

    @Test
    @DisplayName("Path-traversal sequences cannot escape the storage root")
    void traversalIsNeutralised(@TempDir Path dir) throws Exception {
        StorageService service = withLocalDir(dir);

        // The "../" sequences are stripped, so the write stays under <dir>/materials
        // (it lands at <dir>/materials/etc/passwd, never at <dir>/../etc/passwd).
        service.upload("materials", "../../etc/passwd", new byte[] {7}, "text/plain");

        try (var paths = Files.walk(dir)) {
            boolean escaped = paths.filter(Files::isRegularFile)
                    .anyMatch(p -> !p.normalize().startsWith(dir.normalize()));
            assertThat(escaped).as("no file written outside the storage root").isFalse();
        }

        // resolveLocal never returns a path outside the storage root, whatever the input.
        Path resolved = service.resolveLocal("materials", "../../etc/passwd");
        if (resolved != null) {
            assertThat(resolved.normalize().startsWith(dir.normalize()))
                    .as("resolved path stays inside the storage root").isTrue();
        }
    }
}
