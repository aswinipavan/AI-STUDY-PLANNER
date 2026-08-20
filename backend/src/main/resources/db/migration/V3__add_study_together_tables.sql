-- ==========================================================
-- V3: Add Study Together Collaborative Study Rooms
-- ==========================================================

CREATE TABLE IF NOT EXISTS study_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code VARCHAR(30) UNIQUE NOT NULL,
    owner_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    subject_name VARCHAR(100),
    topic VARCHAR(200),
    duration_minutes INTEGER DEFAULT 50,
    max_participants INTEGER DEFAULT 4,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS study_room_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES study_rooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    student_name VARCHAR(100),
    avatar_url TEXT,
    is_owner BOOLEAN DEFAULT false,
    joined_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_room_student UNIQUE(room_id, student_id)
);

CREATE TABLE IF NOT EXISTS study_room_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES study_rooms(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES students(id) ON DELETE SET NULL,
    sender_name VARCHAR(100),
    message TEXT NOT NULL,
    is_ai BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_rooms_room_code ON study_rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_study_rooms_owner ON study_rooms(owner_id);
CREATE INDEX IF NOT EXISTS idx_study_rooms_status ON study_rooms(status);
CREATE INDEX IF NOT EXISTS idx_room_participants_room ON study_room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_room_messages_room ON study_room_messages(room_id);

-- RLS
ALTER TABLE study_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_room_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Study room read access" ON study_rooms FOR SELECT USING (true);
CREATE POLICY "Study room participant access" ON study_room_participants FOR ALL USING (true);
CREATE POLICY "Study room messages access" ON study_room_messages FOR ALL USING (true);
