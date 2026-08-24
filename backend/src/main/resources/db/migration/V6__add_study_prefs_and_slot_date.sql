-- ==========================================================
-- V6: Study-time preference + concrete slot dates
-- ==========================================================
-- 1. students.preferred_study_time — the user's preferred daily study window
--    (StudyTimeWindow name, e.g. 'EVENING'). Source of truth for when AI-generated
--    timetable slots start, replacing the previously hard-coded 18:00.
-- 2. timetable_slots.slot_date — the concrete calendar date of each slot, so multi-week
--    plans keep distinct dates instead of collapsing every weekday onto the first week.
-- Idempotent: safe to re-run / no-op where columns already exist.

ALTER TABLE students
    ADD COLUMN IF NOT EXISTS preferred_study_time VARCHAR(20) DEFAULT 'EVENING';

ALTER TABLE timetable_slots
    ADD COLUMN IF NOT EXISTS slot_date DATE;
