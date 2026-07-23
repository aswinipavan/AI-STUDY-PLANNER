package com.aistudyplanner.service;

import com.aistudyplanner.exception.ResourceNotFoundException;
import com.aistudyplanner.model.dto.request.MarksRequest;
import com.aistudyplanner.model.dto.response.MarksResponse;
import com.aistudyplanner.model.entity.Marks;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.model.entity.Subject;
import com.aistudyplanner.repository.MarksRepository;
import com.aistudyplanner.repository.StudentRepository;
import com.aistudyplanner.repository.SubjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MarksService {

    private final MarksRepository marksRepository;
    private final SubjectRepository subjectRepository;
    private final StudentRepository studentRepository;

    @Transactional
    public MarksResponse addMarks(UUID studentId, MarksRequest request) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        Subject subject = subjectRepository.findById(request.getSubjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));

        if (!subject.getStudent().getId().equals(studentId)) {
            throw new IllegalArgumentException("Subject does not belong to student");
        }

        if (request.getMarksObtained().compareTo(request.getTotalMarks()) > 0) {
            throw new IllegalArgumentException("Marks obtained cannot be greater than total marks");
        }

        Marks marks = Marks.builder()
                .student(student)
                .subject(subject)
                .examType(request.getExamType())
                .marksObtained(request.getMarksObtained())
                .totalMarks(request.getTotalMarks())
                .examDate(request.getExamDate())
                .build();

        marks.calculatePercentage();
        marks = marksRepository.save(marks);
        return toMarksResponse(marks);
    }

    @Transactional
    public MarksResponse updateMarks(UUID studentId, UUID marksId, MarksRequest request) {
        Marks marks = marksRepository.findById(marksId)
                .orElseThrow(() -> new ResourceNotFoundException("Marks not found"));

        if (!marks.getStudent().getId().equals(studentId)) {
            throw new IllegalArgumentException("Marks do not belong to student");
        }

        if (request.getExamType() != null) marks.setExamType(request.getExamType());
        if (request.getMarksObtained() != null) marks.setMarksObtained(request.getMarksObtained());
        if (request.getTotalMarks() != null) marks.setTotalMarks(request.getTotalMarks());
        if (request.getExamDate() != null) marks.setExamDate(request.getExamDate());

        if (marks.getMarksObtained().compareTo(marks.getTotalMarks()) > 0) {
            throw new IllegalArgumentException("Marks obtained cannot be greater than total marks");
        }

        marks.calculatePercentage();
        marks = marksRepository.save(marks);
        return toMarksResponse(marks);
    }

    @Transactional
    public void deleteMarks(UUID studentId, UUID marksId) {
        Marks marks = marksRepository.findById(marksId)
                .orElseThrow(() -> new ResourceNotFoundException("Marks not found"));

        if (!marks.getStudent().getId().equals(studentId)) {
            throw new IllegalArgumentException("Marks do not belong to student");
        }
        marksRepository.delete(marks);
    }

    @Transactional(readOnly = true)
    public List<MarksResponse> getMarksBySubject(UUID studentId, UUID subjectId) {
        return marksRepository.findAllByStudentIdAndSubjectId(studentId, subjectId)
                .stream().map(this::toMarksResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MarksResponse> getAllMarks(UUID studentId) {
        return marksRepository.findAllByStudentIdOrderByExamDateDesc(studentId)
                .stream().map(this::toMarksResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<MarksResponse> getAllMarksPaginated(UUID studentId, int page, int pageSize) {
        if (page < 0 || pageSize < 1 || pageSize > 500) {
            throw new IllegalArgumentException("Invalid pagination parameters: page >= 0, 1 <= pageSize <= 500");
        }
        Pageable pageable = PageRequest.of(page, pageSize);
        Page<Marks> marksPage = marksRepository.findAllByStudentIdOrderByExamDateDesc(studentId, pageable);
        return marksPage.map(this::toMarksResponse);
    }

    @Transactional(readOnly = true)
    public Page<MarksResponse> getMarksBySubjectPaginated(UUID studentId, UUID subjectId, int page, int pageSize) {
        if (page < 0 || pageSize < 1 || pageSize > 500) {
            throw new IllegalArgumentException("Invalid pagination parameters: page >= 0, 1 <= pageSize <= 500");
        }
        Pageable pageable = PageRequest.of(page, pageSize);
        Page<Marks> marksPage = marksRepository.findAllByStudentIdAndSubjectIdOrderByExamDateDesc(studentId, subjectId, pageable);
        return marksPage.map(this::toMarksResponse);
    }

    @Transactional(readOnly = true)
    public Map<String, Double> getSubjectWiseAverages(UUID studentId) {
        List<Object[]> averages = marksRepository.findAveragePercentageBySubject(studentId);
        Map<String, Double> result = new HashMap<>();

        for (Object[] obj : averages) {
            UUID subId = (UUID) obj[0];
            Double avg = ((Number) obj[1]).doubleValue();
            
            subjectRepository.findById(subId).ifPresent(sub -> {
                result.put(sub.getSubjectName(), avg);
            });
        }
        return result;
    }

    private MarksResponse toMarksResponse(Marks marks) {
        return MarksResponse.builder()
                .id(marks.getId())
                .subject(StudentMapper.toSubjectResponse(marks.getSubject()))
                .examType(marks.getExamType())
                .marksObtained(marks.getMarksObtained())
                .totalMarks(marks.getTotalMarks())
                .percentage(marks.getPercentage())
                .examDate(marks.getExamDate())
                .build();
    }
}
