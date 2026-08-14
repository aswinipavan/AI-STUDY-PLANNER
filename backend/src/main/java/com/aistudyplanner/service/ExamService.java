package com.aistudyplanner.service;

import com.aistudyplanner.exception.ResourceNotFoundException;
import com.aistudyplanner.model.dto.request.ExamRequest;
import com.aistudyplanner.model.dto.response.ExamResponse;
import com.aistudyplanner.model.entity.Exam;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.model.entity.Subject;
import com.aistudyplanner.repository.ExamRepository;
import com.aistudyplanner.repository.SubjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class ExamService {

    private final ExamRepository examRepository;
    private final SubjectRepository subjectRepository;
    private final GroqService groqService;
    private final MarksService marksService;

    @Transactional
    public ExamResponse createExam(UUID studentId, ExamRequest request) {
        if (request.getExamDate() != null && request.getExamDate().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("Exam date must be today or in the future");
        }

        Subject subject = subjectRepository.findById(request.getSubjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));

        if (!subject.getStudent().getId().equals(studentId)) {
            throw new IllegalArgumentException("Subject does not belong to student");
        }

        Exam exam = Exam.builder()
                .student(subject.getStudent())
                .subject(subject)
                .examName(request.getExamName())
                .examDate(request.getExamDate())
                .examType(request.getExamType())
                .durationHours(request.getDurationHours())
                .syllabusCovered(request.getSyllabusCovered())
                .difficulty(request.getDifficulty())
                .notes(request.getNotes())
                .isCompleted(false)
                .build();

        exam = examRepository.save(exam);
        return toExamResponse(exam);
    }

    @Transactional(readOnly = true)
    public List<ExamResponse> getUpcomingExams(UUID studentId) {
        return examRepository.findUpcomingExams(studentId, LocalDate.now()).stream()
                .map(this::toExamResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ExamResponse> getAllExams(UUID studentId) {
        return examRepository.findAllByStudentIdOrderByExamDateAsc(studentId, org.springframework.data.domain.PageRequest.of(0, 100)).stream()
                .map(this::toExamResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ExamResponse updateExam(UUID studentId, UUID examId, ExamRequest request) {
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found"));

        if (!exam.getStudent().getId().equals(studentId)) {
            throw new IllegalArgumentException("Exam does not belong to student");
        }

        if (request.getExamDate() != null) exam.setExamDate(request.getExamDate());
        if (request.getExamName() != null) exam.setExamName(request.getExamName());
        if (request.getExamType() != null) exam.setExamType(request.getExamType());
        if (request.getDurationHours() != null) exam.setDurationHours(request.getDurationHours());
        if (request.getSyllabusCovered() != null) exam.setSyllabusCovered(request.getSyllabusCovered());
        if (request.getDifficulty() != null) exam.setDifficulty(request.getDifficulty());
        if (request.getNotes() != null) exam.setNotes(request.getNotes());

        exam = examRepository.save(exam);
        return toExamResponse(exam);
    }

    @Transactional
    public ExamResponse markExamComplete(UUID studentId, UUID examId) {
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found"));

        if (!exam.getStudent().getId().equals(studentId)) {
            throw new IllegalArgumentException("Exam does not belong to student");
        }

        exam.setIsCompleted(true);
        exam = examRepository.save(exam);
        return toExamResponse(exam);
    }

    @Transactional
    public void deleteExam(UUID studentId, UUID examId) {
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found"));

        if (!exam.getStudent().getId().equals(studentId)) {
            throw new IllegalArgumentException("Exam does not belong to student");
        }

        examRepository.delete(exam);
    }

    @Transactional(readOnly = true)
    public String generateExamPrepPlan(UUID studentId) {
        List<ExamResponse> upcomingExams = getUpcomingExams(studentId);
        Map<String, Double> subjectAverages = marksService.getSubjectWiseAverages(studentId);

        String studentName = "Student";
        try {
            if (!upcomingExams.isEmpty()) {
                Student student = upcomingExams.stream()
                        .findFirst()
                        .map(exam -> {
                            try {
                                return examRepository.findById(exam.getId())
                                        .map(e -> e.getStudent())
                                        .orElse(null);
                            } catch (Exception e) {
                                log.error("Error fetching student for exam: {}", exam.getId(), e);
                                return null;
                            }
                        })
                        .orElse(null);
                
                if (student != null && student.getFullName() != null) {
                    studentName = student.getFullName();
                }
            }
        } catch (Exception e) {
            log.error("Error getting student name for exam plan", e);
        }

        return groqService.generateExamPlan(studentName, upcomingExams, subjectAverages);
    }

    private ExamResponse toExamResponse(Exam exam) {
        long daysRemaining = 0;
        if (exam.getExamDate() != null && !exam.getIsCompleted()) {
            daysRemaining = ChronoUnit.DAYS.between(LocalDate.now(), exam.getExamDate());
            if (daysRemaining < 0) daysRemaining = 0;
        }

        return ExamResponse.builder()
                .id(exam.getId())
                .subject(StudentMapper.toSubjectResponse(exam.getSubject()))
                .examName(exam.getExamName())
                .examDate(exam.getExamDate())
                .examType(exam.getExamType())
                .syllabusCovered(exam.getSyllabusCovered())
                .difficulty(exam.getDifficulty())
                .notes(exam.getNotes())
                .isCompleted(exam.getIsCompleted())
                .daysRemaining(daysRemaining)
                .build();
    }
}
