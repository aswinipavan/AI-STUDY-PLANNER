# Database & Test Data Audit Report (Phase 10)

**Date:** 2026-08-20  
**Project:** AI Study Planner  
**Database Engine:** PostgreSQL 15 (Supabase) + Flyway Migrations (`V1`, `V2`, `V3`)  
**Status:** ✅ AUDITED & VERIFIED

---

## 1. Schema & Table Inventory

| Table Name | Primary Key | Foreign Keys & Cascade Rules | Indexes | Row Level Security (RLS) | Status |
|---|---|---|---|---|---|
| `students` | `id` (UUID) | None (Root entity) | `idx_students_firebase_uid`, `idx_students_email` | Enabled (`auth.uid()`) | Verified |
| `subjects` | `id` (UUID) | `student_id -> students(id)` ON DELETE CASCADE | `idx_subjects_student` | Enabled | Verified |
| `exams` | `id` (UUID) | `student_id -> students(id)` ON DELETE CASCADE, `subject_id -> subjects(id)` ON DELETE SET NULL | `idx_exams_student_date` | Enabled | Verified |
| `timetables` | `id` (UUID) | `student_id -> students(id)` ON DELETE CASCADE | `idx_timetables_student_active` | Enabled | Verified |
| `timetable_slots`| `id` (UUID) | `timetable_id -> timetables(id)` ON DELETE CASCADE, `subject_id -> subjects(id)` ON DELETE SET NULL | `idx_slots_timetable` | Enabled | Verified |
| `materials` | `id` (UUID) | `student_id -> students(id)` ON DELETE CASCADE, `subject_id -> subjects(id)` ON DELETE SET NULL | `idx_materials_student`, `idx_materials_processing_status` | Enabled | Verified |
| `marks` | `id` (UUID) | `student_id -> students(id)` ON DELETE CASCADE, `subject_id -> subjects(id)` ON DELETE CASCADE | `idx_marks_student_subject` | Enabled | Verified |
| `chat_sessions` | `id` (UUID) | `student_id -> students(id)` ON DELETE CASCADE | `idx_chat_sessions_student` | Enabled | Verified |
| `chat_messages` | `id` (UUID) | `session_id -> chat_sessions(id)` ON DELETE CASCADE | `idx_chat_messages_session` | Enabled | Verified |
| `subscriptions` | `id` (UUID) | `student_id -> students(id)` ON DELETE CASCADE | `idx_subscriptions_student` | Enabled | Verified |
| `payment_orders`| `id` (UUID) | `student_id -> students(id)` ON DELETE CASCADE | `idx_payment_orders_student` | Enabled | Verified |
| `performance_snapshots`| `id` (UUID) | `student_id -> students(id)` ON DELETE CASCADE | `idx_snapshots_student_date` | Enabled | Verified |
| `study_rooms` | `id` (UUID) | `owner_id -> students(id)` ON DELETE CASCADE, `subject_id -> subjects(id)` ON DELETE SET NULL | `idx_study_rooms_room_code`, `idx_study_rooms_status` | Enabled | Verified |
| `study_room_participants` | `id` (UUID) | `room_id -> study_rooms(id)` ON DELETE CASCADE, `student_id -> students(id)` ON DELETE CASCADE | `idx_room_participants_room`, `uq_room_student` | Enabled | Verified |
| `study_room_messages` | `id` (UUID) | `room_id -> study_rooms(id)` ON DELETE CASCADE, `sender_id -> students(id)` ON DELETE SET NULL | `idx_room_messages_room` | Enabled | Verified |

---

## 2. Integrity & Constraint Verification

1. **Foreign Key Deletion Rules**:
   - Deleting a student cascades cleanly to all personal data (subjects, exams, timetables, marks, materials, study rooms owned, chat history).
   - Deleting a subject sets `subject_id = NULL` on exams and timetable slots, preventing broken slot references.
2. **Unique Constraints**:
   - `students.firebase_uid` UNIQUE
   - `students.email` UNIQUE
   - `study_rooms.room_code` UNIQUE (Case-insensitive indexed)
   - `study_room_participants(room_id, student_id)` UNIQUE (prevents duplicate participant entries)
3. **Data Type Consistency**:
   - All temporal columns use `TIMESTAMPTZ` (UTC OffsetDateTime).
   - All identifiers use RFC 4122 `UUID` v4.
   - Text fields have bounded VARCHARs or TEXT columns for long NLP extracts.

---

## 3. Migration Sequence Verification

- `V1__initial_schema.sql`: Core schema (Students, Subjects, Exams, Timetables, Marks, Materials, Chat, Subscriptions).
- `V2__add_material_nlp_columns.sql`: Additive NLP columns (`processing_status`, `extracted_topics`, `extracted_chapters`, `extracted_keywords`, `overall_difficulty`, `difficulty_score`, `difficulty_reason`).
- `V3__add_study_together_tables.sql`: Additive collaborative study rooms (`study_rooms`, `study_room_participants`, `study_room_messages`).

**Result:** Zero migration conflicts, 100% backward compatible, zero data loss.
