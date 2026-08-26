package com.aistudyplanner.repository;

import com.aistudyplanner.model.entity.TimetableSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface TimetableSlotRepository extends JpaRepository<TimetableSlot, UUID> {

    List<TimetableSlot> findAllByTimetableId(UUID timetableId);

    List<TimetableSlot> findAllByTimetableIdOrderByDayOfWeekAscStartTimeAsc(UUID timetableId);

    List<TimetableSlot> findAllByTimetableIdAndDayOfWeek(UUID timetableId, int dayOfWeek);

    long countByTimetableIdAndIsCompleted(UUID timetableId, boolean isCompleted);

    @Query("SELECT ts FROM TimetableSlot ts LEFT JOIN FETCH ts.subject WHERE ts.timetable.id = :timetableId ORDER BY ts.dayOfWeek ASC, ts.startTime ASC")
    List<TimetableSlot> findAllByTimetableIdWithSubjectFetch(@Param("timetableId") UUID timetableId);

    /**
     * Every slot of a timetable in true chronological order, with the subject eagerly fetched.
     *
     * <p>Unlike {@link #findAllByTimetableIdWithSubjectFetch} this orders by the concrete
     * {@code slotDate} rather than the Monday=0 day-of-week index, which is what adaptive
     * re-planning needs: a plan can span many weeks, so "day 0" recurs and cannot order a
     * multi-week horizon. Legacy rows with a null {@code slotDate} sort last.</p>
     */
    @Query("SELECT ts FROM TimetableSlot ts LEFT JOIN FETCH ts.subject "
            + "WHERE ts.timetable.id = :timetableId "
            + "ORDER BY ts.slotDate ASC NULLS LAST, ts.startTime ASC")
    List<TimetableSlot> findAllByTimetableIdOrderBySlotDate(@Param("timetableId") UUID timetableId);

    /**
     * Slots of a student's ACTIVE timetables that are in the past and still not completed —
     * i.e. missed study sessions that adaptive rescheduling has to find a new home for.
     */
    @Query("SELECT ts FROM TimetableSlot ts LEFT JOIN FETCH ts.subject "
            + "WHERE ts.timetable.student.id = :studentId AND ts.timetable.isActive = true "
            + "AND ts.slotDate IS NOT NULL AND ts.slotDate < :today "
            + "AND (ts.isCompleted IS NULL OR ts.isCompleted = false) "
            + "ORDER BY ts.slotDate ASC, ts.startTime ASC")
    List<TimetableSlot> findMissedSlots(@Param("studentId") UUID studentId, @Param("today") LocalDate today);

    /**
     * Every completed slot for a student across all timetables, oldest first. This is the record of
     * what has genuinely been studied, and is the source of truth for "do not repeat covered topics".
     */
    @Query("SELECT ts FROM TimetableSlot ts LEFT JOIN FETCH ts.subject "
            + "WHERE ts.timetable.student.id = :studentId AND ts.isCompleted = true "
            + "ORDER BY ts.slotDate ASC NULLS LAST, ts.startTime ASC")
    List<TimetableSlot> findCompletedSlotsForStudent(@Param("studentId") UUID studentId);
}

