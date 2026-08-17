-- ==========================================================
-- V2: Add Material NLP and Document Intelligence columns
-- ==========================================================

ALTER TABLE materials
    ADD COLUMN IF NOT EXISTS processing_status VARCHAR(30) DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS extracted_topics TEXT,
    ADD COLUMN IF NOT EXISTS extracted_chapters TEXT,
    ADD COLUMN IF NOT EXISTS extracted_keywords TEXT,
    ADD COLUMN IF NOT EXISTS overall_difficulty VARCHAR(20),
    ADD COLUMN IF NOT EXISTS difficulty_score INTEGER,
    ADD COLUMN IF NOT EXISTS difficulty_reason TEXT,
    ADD COLUMN IF NOT EXISTS error_message TEXT;

CREATE INDEX IF NOT EXISTS idx_materials_processing_status ON materials(processing_status);
