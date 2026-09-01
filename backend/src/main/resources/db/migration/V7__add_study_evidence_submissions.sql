-- ==========================================================
-- V7: Evidence-based study session completion submissions
-- ==========================================================

CREATE TABLE IF NOT EXISTS study_evidence_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timetable_slot_id UUID NOT NULL REFERENCES timetable_slots(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size_bytes BIGINT,
    verification_status VARCHAR(30) NOT NULL,
    score INT,
    summary TEXT,
    matched_topics TEXT,
    missing_topics TEXT,
    feedback TEXT,
    confidence INT,
    verified_at TIMESTAMPTZ,
    is_used_for_completion BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evidence_slot_student ON study_evidence_submissions(timetable_slot_id, student_id);
CREATE INDEX IF NOT EXISTS idx_evidence_status ON study_evidence_submissions(verification_status);
