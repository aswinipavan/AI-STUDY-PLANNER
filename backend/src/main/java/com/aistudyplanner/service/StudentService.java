package com.aistudyplanner.service;

import com.aistudyplanner.exception.ResourceNotFoundException;
import com.aistudyplanner.model.dto.request.NotificationPreferencesRequest;
import com.aistudyplanner.model.dto.request.SubjectRequest;
import com.aistudyplanner.model.dto.request.UpdateProfileRequest;
import com.aistudyplanner.model.dto.response.StudentResponse;
import com.aistudyplanner.model.dto.response.SubjectResponse;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.model.entity.Subject;
import com.aistudyplanner.repository.StudentRepository;
import com.aistudyplanner.repository.SubjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StudentService {

    private final StudentRepository studentRepository;
    private final SubjectRepository subjectRepository;

    @Transactional(readOnly = true)
    public StudentResponse getProfile(UUID studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        return StudentMapper.toStudentResponse(student);
    }

    @Transactional
    public StudentResponse updateProfile(UUID studentId, UpdateProfileRequest request) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        if (request.getFullName() != null) student.setFullName(request.getFullName());
        if (request.getEmail() != null) student.setEmail(request.getEmail());
        if (request.getCollegeName() != null) student.setCollegeName(request.getCollegeName());
        if (request.getSemester() != null) student.setSemester(request.getSemester());
        if (request.getDepartment() != null) student.setDepartment(request.getDepartment());
        if (request.getAvailableHoursPerDay() != null) student.setAvailableHoursPerDay(request.getAvailableHoursPerDay());
        if (request.getPreferredStudyTime() != null) student.setPreferredStudyTime(request.getPreferredStudyTime());
        if (request.getProfilePictureUrl() != null) student.setProfilePictureUrl(request.getProfilePictureUrl());

        student = studentRepository.save(student);
        return StudentMapper.toStudentResponse(student);
    }

    @Transactional
    public StudentResponse updateNotificationPreferences(UUID studentId, NotificationPreferencesRequest request) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        if (request.getEmailNotifications() != null) {
            student.setEmailNotifications(request.getEmailNotifications());
        }
        if (request.getPushNotifications() != null) {
            student.setPushNotifications(request.getPushNotifications());
        }

        student = studentRepository.save(student);
        return StudentMapper.toStudentResponse(student);
    }

    @Transactional(readOnly = true)
    public List<SubjectResponse> getSubjects(UUID studentId) {
        return subjectRepository.findAllByStudentId(studentId, org.springframework.data.domain.PageRequest.of(0, 50)).stream()
                .map(StudentMapper::toSubjectResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public SubjectResponse createSubject(UUID studentId, SubjectRequest request) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        if (subjectRepository.findByStudentIdAndSubjectNameIgnoreCase(studentId, request.getSubjectName()).isPresent()) {
            throw new IllegalArgumentException("Subject with this name already exists");
        }

        Subject subject = Subject.builder()
                .student(student)
                .subjectName(request.getSubjectName())
                .subjectCode(request.getSubjectCode())
                .credits(request.getCredits())
                .difficultyLevel(request.getDifficultyLevel() != null ? request.getDifficultyLevel() : 3)
                .semester(request.getSemester())
                .build();

        subject = subjectRepository.save(subject);
        return StudentMapper.toSubjectResponse(subject);
    }

    @Transactional
    public SubjectResponse updateSubject(UUID studentId, UUID subjectId, SubjectRequest request) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));

        if (!subject.getStudent().getId().equals(studentId)) {
            throw new IllegalArgumentException("Subject does not belong to student");
        }

        if (request.getSubjectName() != null) subject.setSubjectName(request.getSubjectName());
        if (request.getSubjectCode() != null) subject.setSubjectCode(request.getSubjectCode());
        if (request.getCredits() != null) subject.setCredits(request.getCredits());
        if (request.getDifficultyLevel() != null) subject.setDifficultyLevel(request.getDifficultyLevel());
        if (request.getSemester() != null) subject.setSemester(request.getSemester());

        subject = subjectRepository.save(subject);
        return StudentMapper.toSubjectResponse(subject);
    }

    @Transactional
    public void deleteSubject(UUID studentId, UUID subjectId) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));

        if (!subject.getStudent().getId().equals(studentId)) {
            throw new IllegalArgumentException("Subject does not belong to student");
        }

        // Cascade delete will handle related marks, exams, timetable slots, materials
        // This is safe because of CascadeType.ALL, orphanRemoval=true in Student entity
        subjectRepository.delete(subject);
    }

    @Transactional
    public void deleteAccount(UUID studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        studentRepository.delete(student);
    }
}

