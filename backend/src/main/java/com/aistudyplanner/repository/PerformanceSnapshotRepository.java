package com.aistudyplanner.repository;

import com.aistudyplanner.model.entity.PerformanceSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PerformanceSnapshotRepository extends JpaRepository<PerformanceSnapshot, UUID> {

    List<PerformanceSnapshot> findAllByStudentIdOrderBySnapshotDateDesc(UUID studentId);

    Optional<PerformanceSnapshot> findByStudentIdAndSnapshotDate(UUID studentId, LocalDate snapshotDate);
}
