package com.aistudyplanner.config;

import com.google.firebase.FirebaseApp;
import com.google.firebase.auth.FirebaseAuth;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import static org.mockito.Mockito.mock;

/**
 * Test-profile replacement for {@link FirebaseConfig}.
 *
 * <p>Initialising the real Firebase Admin SDK needs a service-account private key — a production
 * secret that CI has no business holding. {@code FirebaseConfig} is therefore {@code @Profile("!test")}
 * and this class stands in under {@code test}, supplying the two beans the application injects:
 * {@code FirebaseAuth} into {@code FirebaseTokenFilter} and {@code AuthService}.
 *
 * <p>This is a stub, not a security bypass. The stubs are inert — every method returns
 * {@code null}/default, so no test can accidentally verify a Firebase ID token through them.
 * The integration tests authenticate with genuine application JWTs issued by
 * {@code JwtTokenProvider}, and the real {@code FirebaseTokenFilter} and {@code SecurityConfig}
 * still run and still reject unauthenticated requests. Firebase's own fail-fast configuration
 * checks remain live in every non-test profile.
 *
 * <p>Picked up by the {@code com.aistudyplanner} component scan because it is a plain
 * {@code @Configuration} on the test classpath — {@code @TestConfiguration} would be filtered
 * out of scanning and would need an explicit {@code @Import} on every test class.
 */
@Configuration
@Profile("test")
public class TestFirebaseConfig {

    @Bean
    public FirebaseApp firebaseApp() {
        return mock(FirebaseApp.class);
    }

    @Bean
    public FirebaseAuth firebaseAuth() {
        return mock(FirebaseAuth.class);
    }
}
