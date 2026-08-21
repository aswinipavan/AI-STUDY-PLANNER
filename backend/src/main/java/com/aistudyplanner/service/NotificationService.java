package com.aistudyplanner.service;

import com.aistudyplanner.model.dto.response.NotificationResponse;
import com.aistudyplanner.model.entity.Exam;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.model.entity.StudyRoom;
import com.aistudyplanner.model.entity.Subject;
import com.aistudyplanner.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final ExamRepository examRepository;
    private final MarksRepository marksRepository;
    private final SubjectRepository subjectRepository;
    private final StudyRoomRepository studyRoomRepository;

    @Transactional(readOnly = true)
    @Cacheable(value = "notifications", key = "#student.id", unless = "#result.isEmpty()")
    public List<NotificationResponse> getPersonalizedNotifications(Student student) {
        UUID studentId = student.getId();
        List<NotificationResponse> notifications = new ArrayList<>();

        // 1. Upcoming Exams (7 days, 3 days, 1 day)
        LocalDate today = LocalDate.now();
        List<Exam> upcomingExams = examRepository.findUpcomingExams(studentId, today);
        for (Exam exam : upcomingExams) {
            long daysRemaining = ChronoUnit.DAYS.between(today, exam.getExamDate());
            if (daysRemaining <= 1) {
                notifications.add(NotificationResponse.builder()
                        .id("exam-urgent-" + exam.getId())
                        .type("EXAM_ALERT")
                        .title("🚨 Urgent Exam Tomorrow: " + exam.getExamName())
                        .message(String.format("Your %s exam for %s is in %d day! Review high-yield topics now.",
                                exam.getExamName(),
                                exam.getSubject() != null ? exam.getSubject().getSubjectName() : "your subject",
                                Math.max(1, daysRemaining)))
                        .priority("HIGH")
                        .actionUrl("/exams")
                        .createdAt(OffsetDateTime.now())
                        .isRead(false)
                        .build());
            } else if (daysRemaining <= 3) {
                notifications.add(NotificationResponse.builder()
                        .id("exam-3day-" + exam.getId())
                        .type("EXAM_ALERT")
                        .title("⚠️ Exam in " + daysRemaining + " Days: " + exam.getExamName())
                        .message(String.format("Only %d days left until %s. Focus on weak areas and mock tests.",
                                daysRemaining, exam.getExamName()))
                        .priority("HIGH")
                        .actionUrl("/exams")
                        .createdAt(OffsetDateTime.now().minusHours(2))
                        .isRead(false)
                        .build());
            } else if (daysRemaining <= 7) {
                notifications.add(NotificationResponse.builder()
                        .id("exam-7day-" + exam.getId())
                        .type("EXAM_ALERT")
                        .title("📅 Upcoming Exam: " + exam.getExamName())
                        .message(String.format("%s is scheduled in %d days (%s). Generate a revision plan.",
                                exam.getExamName(), daysRemaining, exam.getExamDate()))
                        .priority("MEDIUM")
                        .actionUrl("/timetable")
                        .createdAt(OffsetDateTime.now().minusHours(6))
                        .isRead(false)
                        .build());
            }
        }

        // 2. Low Performance Alerts (Weak Subjects < 60%)
        Map<UUID, Double> avgBySubject = new HashMap<>();
        List<Object[]> averages = marksRepository.findAveragePercentageBySubject(studentId);
        for (Object[] row : averages) {
            if (row != null && row.length >= 2 && row[0] != null && row[1] != null) {
                avgBySubject.put((UUID) row[0], ((Number) row[1]).doubleValue());
            }
        }

        List<Subject> subjects = subjectRepository.findAllByStudentId(studentId);
        for (Subject subject : subjects) {
            Double avg = avgBySubject.get(subject.getId());
            if (avg != null && avg < 60.0) {
                notifications.add(NotificationResponse.builder()
                        .id("weak-subj-" + subject.getId())
                        .type("LOW_PERFORMANCE")
                        .title("📉 Attention Needed: " + subject.getSubjectName())
                        .message(String.format("Recent average marks in %s are %.1f%%. Ask AI Tutor or solve practice questions.",
                                subject.getSubjectName(), avg))
                        .priority("HIGH")
                        .actionUrl("/priority")
                        .createdAt(OffsetDateTime.now().minusHours(12))
                        .isRead(false)
                        .build());
            }
        }

        // 3. Daily Study Habit / Streak Alert
        int streak = student.getStudyStreak() != null ? student.getStudyStreak() : 0;
        int hours = student.getAvailableHoursPerDay() != null ? student.getAvailableHoursPerDay().intValue() : 3;
        if (streak > 0) {
            notifications.add(NotificationResponse.builder()
                    .id("streak-active")
                    .type("STREAK_ALERT")
                    .title("🔥 " + streak + "-Day Study Streak Active!")
                    .message(String.format("Keep your momentum going! Complete your %d-hour target today.", hours))
                    .priority("LOW")
                    .actionUrl("/dashboard")
                    .createdAt(OffsetDateTime.now().minusHours(1))
                    .isRead(true)
                    .build());
        } else {
            notifications.add(NotificationResponse.builder()
                    .id("streak-restart")
                    .type("STREAK_ALERT")
                    .title("🌱 Start Your Study Streak Today")
                    .message(String.format("Dedicate %d hours today to build consistency and unlock streak badges.", hours))
                    .priority("MEDIUM")
                    .actionUrl("/timetable")
                    .createdAt(OffsetDateTime.now().minusHours(4))
                    .isRead(false)
                    .build());
        }

        // 4. Collaborative Study Rooms Active
        List<StudyRoom> activeRooms = studyRoomRepository.findActiveRooms();
        if (!activeRooms.isEmpty()) {
            StudyRoom room = activeRooms.get(0);
            notifications.add(NotificationResponse.builder()
                    .id("room-active-" + room.getId())
                    .type("STUDY_ROOM")
                    .title("👥 Active Study Room: " + room.getSubjectName())
                    .message(String.format("Peer study session in progress on '%s'. Join with code %s!",
                            room.getTopic(), room.getRoomCode()))
                    .priority("MEDIUM")
                    .actionUrl("/study-together/" + room.getRoomCode())
                    .createdAt(room.getCreatedAt())
                    .isRead(false)
                    .build());
        }

        // Sort by priority (HIGH first, then MEDIUM, then LOW)
        notifications.sort((a, b) -> {
            int pA = "HIGH".equals(a.getPriority()) ? 3 : "MEDIUM".equals(a.getPriority()) ? 2 : 1;
            int pB = "HIGH".equals(b.getPriority()) ? 3 : "MEDIUM".equals(b.getPriority()) ? 2 : 1;
            return Integer.compare(pB, pA);
        });

        return notifications;
    }
}
