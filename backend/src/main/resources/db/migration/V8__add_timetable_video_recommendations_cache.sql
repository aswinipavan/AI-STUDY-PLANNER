-- V8: Add timetable video recommendations cache table
CREATE TABLE IF NOT EXISTS timetable_video_recommendations_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key VARCHAR(255) NOT NULL UNIQUE,
    student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    timetable_slot_id UUID REFERENCES timetable_slots(id) ON DELETE SET NULL,
    topic VARCHAR(255) NOT NULL,
    chapter VARCHAR(255),
    subject_name VARCHAR(255),
    recommendations_json TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_video_rec_cache_key ON timetable_video_recommendations_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_video_rec_expires ON timetable_video_recommendations_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_video_rec_slot ON timetable_video_recommendations_cache(timetable_slot_id);
