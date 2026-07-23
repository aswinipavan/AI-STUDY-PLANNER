package com.aistudyplanner.service;

import com.aistudyplanner.model.dto.response.StudentResponse;
import com.aistudyplanner.model.dto.response.SubjectResponse;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.model.entity.Subject;

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
                .profilePictureUrl(student.getProfilePictureUrl())
                .build();
    }

    public static SubjectResponse toSubjectResponse(Subject subject) {
        if (subject == null) return null;
        return SubjectResponse.builder()
                .id(subject.getId())
                .subjectName(subject.getSubjectName())
                .subjectCode(subject.getSubjectCode())
                .credits(subject.getCredits())
                .difficultyLevel(subject.getDifficultyLevel())
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
