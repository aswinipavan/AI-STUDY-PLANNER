-- ==========================================================
-- V8: AI Revision Mode for completed & verified study sessions
-- ==========================================================

CREATE TABLE IF NOT EXISTS slot_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timetable_slot_id UUID NOT NULL REFERENCES timetable_slots(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    topic VARCHAR(200) NOT NULL,
    summary TEXT,
    key_concepts TEXT,
    important_formulas TEXT,
    quiz_questions TEXT,
    weak_areas TEXT,
    quick_revision_points TEXT,
    score INT,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_revisions_slot_student ON slot_revisions(timetable_slot_id, student_id);
CREATE INDEX IF NOT EXISTS idx_revisions_completion ON slot_revisions(is_completed);
