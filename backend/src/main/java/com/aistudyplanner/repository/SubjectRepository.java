package com.aistudyplanner.repository;

import com.aistudyplanner.model.entity.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SubjectRepository extends JpaRepository<Subject, UUID> {

    List<Subject> findAllByStudentId(UUID studentId, org.springframework.data.domain.Pageable pageable);

    List<Subject> findAllByStudentId(UUID studentId);

    Optional<Subject> findByStudentIdAndSubjectNameIgnoreCase(UUID studentId, String subjectName);
}
