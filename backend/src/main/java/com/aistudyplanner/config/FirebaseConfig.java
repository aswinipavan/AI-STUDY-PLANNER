package com.aistudyplanner.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Base64;

@Configuration
public class FirebaseConfig {

    @Value("${firebase.project-id}")
    private String projectId;

    @Value("${FIREBASE_SERVICE_ACCOUNT_JSON:}")
    private String serviceAccountJsonBase64;

    @Bean
    public FirebaseApp firebaseApp() throws IOException {
        if (!FirebaseApp.getApps().isEmpty()) {
            return FirebaseApp.getInstance();
        }

        InputStream credentialsStream;

        if (serviceAccountJsonBase64 != null && !serviceAccountJsonBase64.isBlank()) {
            byte[] decoded = Base64.getDecoder().decode(serviceAccountJsonBase64);
            credentialsStream = new ByteArrayInputStream(decoded);
        } else {
            credentialsStream = new ClassPathResource("serviceAccountKey.json").getInputStream();
        }

        FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(GoogleCredentials.fromStream(credentialsStream))
                .setProjectId(projectId)
                .build();

        return FirebaseApp.initializeApp(options);
    }

    @Bean
    public FirebaseAuth firebaseAuth(FirebaseApp firebaseApp) {
        return FirebaseAuth.getInstance(firebaseApp);
    }
}
