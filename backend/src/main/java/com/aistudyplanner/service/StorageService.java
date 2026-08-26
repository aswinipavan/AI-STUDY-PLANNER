package com.aistudyplanner.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;

/**
 * Stores uploaded files and returns a URL to persist in the database.
 *
 * <p>Two backends, chosen at runtime:
 * <ul>
 *   <li><b>Supabase Storage (production):</b> when {@code supabase.url} and the service-role key are
 *       configured, bytes are PUT to Supabase using the service-role key. The key stays on the
 *       server and is never exposed to the browser. A public URL is returned.</li>
 *   <li><b>Local filesystem (local/offline):</b> when Supabase is not configured — or when
 *       {@code storage.backend=local} pins it — bytes are written under {@code storage.local.dir}
 *       and served back by {@code FileController} at {@code /api/files/<bucket>/<objectPath>}.</li>
 * </ul>
 *
 * <p>This replaces the previous browser-direct-to-Supabase upload flow, which could not work in the
 * local profile (empty Supabase config produced a hostless upload URL → HTTP 400) and required
 * exposing an upload key to the browser.
 */
@Service
@Slf4j
public class StorageService {

    /** Value of {@code storage.backend} that forces the local filesystem backend. */
    private static final String LOCAL_BACKEND = "local";

    @Value("${supabase.url:}")
    private String supabaseUrl;

    @Value("${supabase.service-role-key:}")
    private String serviceRoleKey;

    @Value("${storage.local.dir:uploads}")
    private String localDir;

    /**
     * Explicit backend selection: {@code auto} (default) uses Supabase when it is configured and
     * falls back to the local filesystem; {@code local} always uses the local filesystem.
     *
     * <p>The local profile pins this to {@code local}. Blanking {@code supabase.url} in
     * {@code application-local.properties} cannot do that job: {@code SUPABASE_URL} and
     * {@code SUPABASE_SERVICE_ROLE_KEY} in {@code backend/.env} relaxed-bind to
     * {@code supabase.url} / {@code supabase.service-role-key}, and OS environment variables
     * outrank profile property files — so local uploads would silently land in the production
     * bucket. {@code .env} defines no {@code STORAGE_BACKEND}, so this key is safe from that.
     */
    @Value("${storage.backend:auto}")
    private String storageBackend;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    /** True when a real Supabase Storage backend is configured and not overridden to local. */
    public boolean usesSupabase() {
        if (LOCAL_BACKEND.equalsIgnoreCase(storageBackend == null ? null : storageBackend.trim())) {
            return false;
        }
        return supabaseUrl != null && !supabaseUrl.isBlank()
                && serviceRoleKey != null && !serviceRoleKey.isBlank();
    }

    /**
     * Store bytes and return the URL to persist.
     *
     * @param bucket      logical bucket, e.g. "materials" or "avatars"
     * @param objectPath  path within the bucket (no leading slash)
     * @param bytes       file contents
     * @param contentType MIME type (may be null)
     * @return the URL to store on the entity and serve to the browser
     */
    public String upload(String bucket, String objectPath, byte[] bytes, String contentType) {
        String safeBucket = sanitiseSegment(bucket);
        String safePath = sanitiseObjectPath(objectPath);
        if (usesSupabase()) {
            return uploadToSupabase(safeBucket, safePath, bytes, contentType);
        }
        return uploadToLocal(safeBucket, safePath, bytes);
    }

    // ── Local filesystem ──────────────────────────────────────────────────────
    private String uploadToLocal(String bucket, String objectPath, byte[] bytes) {
        try {
            Path base = Paths.get(localDir).toAbsolutePath().normalize();
            Path target = base.resolve(bucket).resolve(objectPath).normalize();
            if (!target.startsWith(base)) {
                throw new IllegalArgumentException("Invalid storage path");
            }
            Files.createDirectories(target.getParent());
            Files.write(target, bytes);
            log.info("Stored file locally: {} ({} bytes)", target, bytes.length);
            return "/api/files/" + bucket + "/" + objectPath;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file locally: " + e.getMessage(), e);
        }
    }

    /**
     * Resolve a locally stored file for {@code FileController}. Returns {@code null} if it does not
     * exist or the path escapes the storage root.
     */
    public Path resolveLocal(String bucket, String objectPath) {
        Path base = Paths.get(localDir).toAbsolutePath().normalize();
        Path target = base.resolve(sanitiseSegment(bucket)).resolve(sanitiseObjectPath(objectPath)).normalize();
        if (!target.startsWith(base) || !Files.exists(target) || Files.isDirectory(target)) {
            return null;
        }
        return target;
    }

    // ── Supabase Storage (production) ───────────────────────────────────────────
    private String uploadToSupabase(String bucket, String objectPath, byte[] bytes, String contentType) {
        String base = supabaseUrl.endsWith("/") ? supabaseUrl.substring(0, supabaseUrl.length() - 1) : supabaseUrl;
        String objectUrl = base + "/storage/v1/object/" + bucket + "/" + objectPath;
        try {
            HttpResponse<String> res = putObject(objectUrl, bytes, contentType);
            if (res.statusCode() == 404 || res.statusCode() == 400) {
                // The bucket may not exist yet — create it (public read) and retry once.
                log.warn("Supabase upload returned {} — attempting to create bucket '{}'", res.statusCode(), bucket);
                createBucket(base, bucket);
                res = putObject(objectUrl, bytes, contentType);
            }
            if (res.statusCode() < 200 || res.statusCode() >= 300) {
                throw new RuntimeException("Supabase storage upload failed (" + res.statusCode() + "): " + res.body());
            }
            return base + "/storage/v1/object/public/" + bucket + "/" + objectPath;
        } catch (IOException e) {
            throw new RuntimeException("Supabase storage upload error: " + e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Supabase storage upload interrupted", e);
        }
    }

    private HttpResponse<String> putObject(String url, byte[] bytes, String contentType)
            throws IOException, InterruptedException {
        HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                .header("Authorization", "Bearer " + serviceRoleKey)
                .header("apikey", serviceRoleKey)
                .header("Content-Type", contentType != null && !contentType.isBlank() ? contentType : "application/octet-stream")
                .header("x-upsert", "true")
                .PUT(HttpRequest.BodyPublishers.ofByteArray(bytes))
                .timeout(Duration.ofSeconds(60))
                .build();
        return httpClient.send(req, HttpResponse.BodyHandlers.ofString());
    }

    private void createBucket(String base, String bucket) throws IOException, InterruptedException {
        String body = "{\"id\":\"" + bucket + "\",\"name\":\"" + bucket + "\",\"public\":true}";
        HttpRequest req = HttpRequest.newBuilder(URI.create(base + "/storage/v1/bucket"))
                .header("Authorization", "Bearer " + serviceRoleKey)
                .header("apikey", serviceRoleKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .timeout(Duration.ofSeconds(30))
                .build();
        HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
        log.info("Create bucket '{}' response: {}", bucket, res.statusCode());
    }

    // ── Helpers ─────────────────────────────────────────────────────────────────
    private String sanitiseSegment(String s) {
        return s == null ? "" : s.replaceAll("[^a-zA-Z0-9_-]", "");
    }

    /** Allow slashes (path structure) but strip traversal sequences and leading slashes. */
    private String sanitiseObjectPath(String s) {
        if (s == null) return "";
        String cleaned = s.replace("\\", "/");
        while (cleaned.startsWith("/")) {
            cleaned = cleaned.substring(1);
        }
        return cleaned.replace("../", "").replace("..", "");
    }
}
