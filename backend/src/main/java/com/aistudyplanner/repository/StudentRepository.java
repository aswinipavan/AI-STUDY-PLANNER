package com.aistudyplanner.repository;

import com.aistudyplanner.model.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface StudentRepository extends JpaRepository<Student, UUID> {

    Optional<Student> findByFirebaseUid(String firebaseUid);

    Optional<Student> findByPhoneNumber(String phoneNumber);

    boolean existsByFirebaseUid(String firebaseUid);
}
