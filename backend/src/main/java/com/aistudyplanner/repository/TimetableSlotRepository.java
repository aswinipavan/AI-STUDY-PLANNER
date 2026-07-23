package com.aistudyplanner.repository;

import com.aistudyplanner.model.entity.TimetableSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

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
}

