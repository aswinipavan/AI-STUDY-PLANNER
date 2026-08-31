package com.aistudyplanner.service;

import com.aistudyplanner.model.dto.response.StudentResponse;
import com.aistudyplanner.model.dto.response.SubjectResponse;
import com.aistudyplanner.model.entity.Exam;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.model.entity.Subject;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

@SuppressWarnings("null")
public class StudentMapper {

    public static StudentResponse toStudentResponse(Student student) {
        if (student == null) return null;
        return StudentResponse.builder()
                .id(student.getId())
                .firebaseUid(student.getFirebaseUid())
                .fullName(student.getFullName())
                .email(student.getEmail())
                .phoneNumber(student.getPhoneNumber())
                .collegeName(student.getCollegeName())
                .semester(student.getSemester())
                .department(student.getDepartment())
                .isPremium(student.getIsPremium())
                .studyStreak(student.getStudyStreak())
                .availableHoursPerDay(student.getAvailableHoursPerDay())
                .preferredStudyTime(student.getPreferredStudyTime())
                .profilePictureUrl(student.getProfilePictureUrl())
                .emailNotifications(student.getEmailNotifications())
                .pushNotifications(student.getPushNotifications())
                .build();
    }

    public static SubjectResponse toSubjectResponse(Subject subject) {
        if (subject == null) return null;
        
        // Calculate next exam date and days remaining
        LocalDate nextExamDate = null;
        Long daysUntilExam = null;
        
        try {
            if (subject.getExams() != null && !subject.getExams().isEmpty()) {
                // Find the nearest upcoming exam for this subject
                nextExamDate = subject.getExams().stream()
                        .filter(exam -> exam != null && exam.getExamDate() != null && !Boolean.TRUE.equals(exam.getIsCompleted()))
                        .map(Exam::getExamDate)
                        .min(LocalDate::compareTo)
                        .orElse(null);
                
                if (nextExamDate != null) {
                    daysUntilExam = ChronoUnit.DAYS.between(LocalDate.now(), nextExamDate);
                    if (daysUntilExam < 0) daysUntilExam = 0L;
                }
            }
        } catch (Exception ignored) {
            // Defensive: if lazy collection cannot be initialized outside open session
        }
        
        return SubjectResponse.builder()
                .id(subject.getId())
                .subjectName(subject.getSubjectName())
                .subjectCode(subject.getSubjectCode())
                .credits(subject.getCredits())
                .difficultyLevel(subject.getDifficultyLevel())
                .nextExamDate(nextExamDate)
                .daysUntilExam(daysUntilExam)
                .build();
    }

    public static SubjectResponse toSubjectResponseWithAvg(Subject subject, double avgPercentage) {
        SubjectResponse response = toSubjectResponse(subject);
        if (response != null) {
            response.setAveragePercentage(avgPercentage);
        }
        return response;
    }
}
