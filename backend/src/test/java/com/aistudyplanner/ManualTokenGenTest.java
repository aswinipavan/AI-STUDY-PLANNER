package com.aistudyplanner;

import com.aistudyplanner.security.JwtTokenProvider;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.UUID;

@Disabled("Manual token generation utility - run explicitly when needed")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class ManualTokenGenTest {

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Test
    public void generateToken() {
        String token = jwtTokenProvider.generateToken(UUID.randomUUID(), "test-firebase-uid");
        System.out.println("\n\n=== GENERATED TOKEN ===");
        System.out.println(token);
        System.out.println("=======================\n\n");
    }
}
