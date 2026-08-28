package com.aistudyplanner.config;

import com.google.auth.oauth2.AccessToken;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Date;

/**
 * Real Firebase Admin SDK wiring. Deliberately fails fast when credentials are malformed
 * in production, while supporting mock mode for local and CI environments.
 */
@Configuration
@Profile("!test")
@Slf4j
public class FirebaseConfig {

    @Value("${firebase.project-id:study-planner-ec1d2}")
    private String projectId;

    @Value("${FIREBASE_SERVICE_ACCOUNT_JSON:}")
    private String serviceAccountJson;

    @Bean
    public FirebaseApp firebaseApp() throws IOException {
        if (!FirebaseApp.getApps().isEmpty()) {
            return FirebaseApp.getInstance();
        }

        if (serviceAccountJson == null || serviceAccountJson.isBlank()) {
            log.warn("FIREBASE_SERVICE_ACCOUNT_JSON is not configured. Initializing local mock FirebaseApp.");
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.create(new AccessToken("mock-token", new Date(System.currentTimeMillis() + 86400000))))
                    .setProjectId(projectId != null && !projectId.isBlank() ? projectId : "study-planner-ec1d2")
                    .build();
            return FirebaseApp.initializeApp(options);
        }

        try {
            String trimmed = serviceAccountJson.trim();
            byte[] credentialBytes = trimmed.startsWith("{")
                    ? trimmed.getBytes(StandardCharsets.UTF_8)
                    : Base64.getDecoder().decode(trimmed);
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(new ByteArrayInputStream(credentialBytes)))
                    .setProjectId(projectId)
                    .build();
            return FirebaseApp.initializeApp(options);
        } catch (IllegalArgumentException | IOException ex) {
            throw new IllegalStateException(
                    "Firebase is not configured correctly: FIREBASE_SERVICE_ACCOUNT_JSON must contain valid service-account JSON or Base64-encoded JSON.",
                    ex);
        }
    }

    @Bean
    public FirebaseAuth firebaseAuth(FirebaseApp firebaseApp) {
        return FirebaseAuth.getInstance(firebaseApp);
    }
}
