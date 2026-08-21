package com.aistudyplanner.security;

import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.repository.StudentRepository;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class FirebaseTokenFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final StudentRepository studentRepository;
    private final FirebaseAuth firebaseAuth;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    private static final List<String> SKIP_URLS = Arrays.asList(
            "/api/auth/**",
            "/actuator/health",
            "/swagger-ui/**",
            "/v3/api-docs/**"
    );

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return SKIP_URLS.stream().anyMatch(p -> pathMatcher.match(p, request.getServletPath()));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        try {
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt)) {
                if (jwtTokenProvider.validateToken(jwt)) {
                    UUID studentId = jwtTokenProvider.getStudentIdFromToken(jwt);
                    
                    studentRepository.findById(studentId).ifPresent(student -> {
                        setAuthenticationContext(student, request);
                    });
                } else {
                    try {
                        FirebaseToken firebaseToken = firebaseAuth.verifyIdToken(jwt);
                        String firebaseUid = firebaseToken.getUid();
                        
                        // CRITICAL FIX: Do NOT auto-create students from Firebase tokens
                        // Require explicit signup through AuthService.login() which handles new user creation properly
                        Student student = studentRepository.findByFirebaseUid(firebaseUid)
                                .orElse(null);
                        
                        if (student != null) {
                            setAuthenticationContext(student, request);
                        } else {
                            log.warn("User not found for Firebase UID: {}. User must complete signup.", firebaseUid);
                        }
                    } catch (FirebaseAuthException e) {
                        log.error("Could not verify Firebase token", e);
                    }
                }
            }
        } catch (Exception ex) {
            log.error("Could not set user authentication in security context", ex);
        }

        filterChain.doFilter(request, response);
    }

    private void setAuthenticationContext(Student student, HttpServletRequest request) {
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                student, null, Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER")));
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
