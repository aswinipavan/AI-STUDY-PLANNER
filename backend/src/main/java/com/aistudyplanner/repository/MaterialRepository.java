package com.aistudyplanner.repository;

import com.aistudyplanner.model.entity.Material;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.UUID;

@Repository
public interface MaterialRepository extends JpaRepository<Material, UUID> {

    List<Material> findAllByStudentIdOrderByCreatedAtDesc(UUID studentId);
    Page<Material> findAllByStudentIdOrderByCreatedAtDesc(UUID studentId, Pageable pageable);

    List<Material> findAllByStudentIdAndSubjectId(UUID studentId, UUID subjectId);
    Page<Material> findAllByStudentIdAndSubjectId(UUID studentId, UUID subjectId, Pageable pageable);
}
