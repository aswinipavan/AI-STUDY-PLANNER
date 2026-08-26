package com.aistudyplanner.controller;

import com.aistudyplanner.service.StorageService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Serves files stored on the local filesystem (i.e. when Supabase Storage is not configured).
 *
 * <p>The browser reaches this through the Next.js API proxy, which attaches the httpOnly auth
 * cookie as a Bearer token, so requests are authenticated like any other {@code /api/**} call.
 * When Supabase is configured, files are served by Supabase directly and this controller is unused.
 */
@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
@Slf4j
public class FileController {

    private final StorageService storageService;

    @GetMapping("/{bucket}/**")
    public ResponseEntity<Resource> serve(@PathVariable String bucket, HttpServletRequest request) {
        String uri = URLDecoder.decode(request.getRequestURI(), StandardCharsets.UTF_8);
        String prefix = "/api/files/" + bucket + "/";
        int idx = uri.indexOf(prefix);
        if (idx < 0) {
            return ResponseEntity.notFound().build();
        }
        String objectPath = uri.substring(idx + prefix.length());

        Path file = storageService.resolveLocal(bucket, objectPath);
        if (file == null) {
            return ResponseEntity.notFound().build();
        }

        String contentType = null;
        try {
            contentType = Files.probeContentType(file);
        } catch (Exception ignored) {
            // fall through to extension-based guess
        }
        if (contentType == null) {
            contentType = guessContentType(objectPath);
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .body(new FileSystemResource(file));
    }

    private String guessContentType(String name) {
        String lower = name.toLowerCase();
        if (lower.endsWith(".pdf")) return "application/pdf";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".gif")) return "image/gif";
        if (lower.endsWith(".txt")) return "text/plain";
        return "application/octet-stream";
    }
}
