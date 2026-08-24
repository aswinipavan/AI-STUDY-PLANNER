-- ==========================================================
-- V5: Add exam difficulty and notes columns
-- ==========================================================
-- The Exam entity carries `difficulty` (VARCHAR) and `notes` (TEXT), but the original
-- `exams` table in V1 did not define them. On a fresh deployment (ddl-auto=validate) this
-- mismatch fails schema validation at startup, and on an existing DB inserting an exam with
-- these fields errors out (the HTTP 500 on POST /api/exams). Idempotent so it is a no-op where
-- the columns were already added out-of-band.

ALTER TABLE exams
    ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20),
    ADD COLUMN IF NOT EXISTS notes TEXT;
