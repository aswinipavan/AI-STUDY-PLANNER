package com.aistudyplanner.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Configuration
public class FirebaseConfig {

    @Value("${firebase.project-id}")
    private String projectId;

    @Value("${FIREBASE_SERVICE_ACCOUNT_JSON:}")
    private String serviceAccountJson;

    @Bean
    public FirebaseApp firebaseApp() throws IOException {
        if (!FirebaseApp.getApps().isEmpty()) {
            return FirebaseApp.getInstance();
        }

        if (projectId == null || projectId.isBlank()) {
            throw new IllegalStateException("Firebase is not configured: FIREBASE_PROJECT_ID is required.");
        }
        if (serviceAccountJson == null || serviceAccountJson.isBlank()) {
            throw new IllegalStateException("Firebase is not configured: FIREBASE_SERVICE_ACCOUNT_JSON is required by the backend.");
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
