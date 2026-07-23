package com.aistudyplanner.service;

import com.aistudyplanner.model.dto.request.LoginRequest;
import com.aistudyplanner.model.dto.response.AuthResponse;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.repository.StudentRepository;
import com.aistudyplanner.security.JwtTokenProvider;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final StudentRepository studentRepository;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthResponse login(LoginRequest request) {
        try {
            FirebaseToken firebaseToken = FirebaseAuth.getInstance().verifyIdToken(request.getFirebaseToken());
            String uid = firebaseToken.getUid();
            
            // Extract phone number if available
            String phoneNumber = (String) firebaseToken.getClaims().get("phone_number");

            boolean isNewUser = false;
            Student student = studentRepository.findByFirebaseUid(uid).orElse(null);

            if (student == null) {
                isNewUser = true;
                student = Student.builder()
                        .firebaseUid(uid)
                        .phoneNumber(phoneNumber)
                        .email(firebaseToken.getEmail())
                        .fullName(firebaseToken.getName())
                        .lastActiveDate(LocalDate.now())
                        .build();
                student = studentRepository.save(student);
            } else {
                studyStreakLogic(student);
                student = studentRepository.save(student);
            }

            String token = jwtTokenProvider.generateToken(student.getId(), uid);

            return AuthResponse.builder()
                    .token(token)
                    .student(StudentMapper.toStudentResponse(student))
                    .isNewUser(isNewUser)
                    .build();

        } catch (FirebaseAuthException e) {
            log.error("Firebase token verification failed", e);
            throw new RuntimeException("Invalid Firebase token", e);
        }
    }

    public AuthResponse refreshToken(String firebaseTokenStr) {
        try {
            FirebaseToken firebaseToken = FirebaseAuth.getInstance().verifyIdToken(firebaseTokenStr);
            String uid = firebaseToken.getUid();

            Student student = studentRepository.findByFirebaseUid(uid)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            String token = jwtTokenProvider.generateToken(student.getId(), uid);

            return AuthResponse.builder()
                    .token(token)
                    .student(StudentMapper.toStudentResponse(student))
                    .isNewUser(false)
                    .build();
        } catch (FirebaseAuthException e) {
            log.error("Firebase token verification failed during refresh", e);
            throw new RuntimeException("Invalid Firebase token", e);
        }
    }

    private void studyStreakLogic(Student student) {
        LocalDate today = LocalDate.now();
        LocalDate lastActive = student.getLastActiveDate();

        if (lastActive != null) {
            long daysBetween = ChronoUnit.DAYS.between(lastActive, today);
            if (daysBetween == 1) {
                student.setStudyStreak(student.getStudyStreak() + 1);
            } else if (daysBetween > 1) {
                student.setStudyStreak(1);
            }
        } else {
            student.setStudyStreak(1);
        }
        student.setLastActiveDate(today);
    }
}
