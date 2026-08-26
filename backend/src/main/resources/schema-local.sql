-- ============================================================
-- schema-local.sql  (H2 in-memory, PostgreSQL compatibility mode)
-- Mirrors V1 + V2 + V3 Flyway migrations for local development
-- H2 quirk: UUID column must be declared as:
--   id UUID DEFAULT RANDOM_UUID() NOT NULL, PRIMARY KEY (id)
-- ============================================================

-- 1. students
CREATE TABLE IF NOT EXISTS students (
    id UUID NOT NULL DEFAULT RANDOM_UUID(),
    firebase_uid VARCHAR(128) NOT NULL,
    phone_number VARCHAR(20),
    full_name VARCHAR(100),
    email VARCHAR(150),
    college_name VARCHAR(200),
    semester INTEGER,
    department VARCHAR(100),
    available_hours_per_day DECIMAL(4,1) DEFAULT 4.0,
    preferred_study_time VARCHAR(20) DEFAULT 'EVENING',
    is_premium BOOLEAN DEFAULT false,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT false,
    study_streak INTEGER DEFAULT 0,
    last_active_date DATE,
    profile_picture_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_students_firebase_uid UNIQUE (firebase_uid),
    CONSTRAINT uq_students_phone UNIQUE (phone_number)
);

-- 2. subjects
CREATE TABLE IF NOT EXISTS subjects (
    id UUID NOT NULL DEFAULT RANDOM_UUID(),
    student_id UUID,
    subject_name VARCHAR(100) NOT NULL,
    subject_code VARCHAR(20),
    credits INTEGER,
    difficulty_level INTEGER DEFAULT 3 CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
    semester INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 3. marks
CREATE TABLE IF NOT EXISTS marks (
    id UUID NOT NULL DEFAULT RANDOM_UUID(),
    student_id UUID,
    subject_id UUID,
    exam_type VARCHAR(50),
    marks_obtained DECIMAL(6,2),
    total_marks DECIMAL(6,2),
    percentage DECIMAL(5,2),
    exam_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- 4. exams
CREATE TABLE IF NOT EXISTS exams (
    id UUID NOT NULL DEFAULT RANDOM_UUID(),
    student_id UUID,
    subject_id UUID,
    exam_name VARCHAR(100),
    exam_date DATE NOT NULL,
    exam_type VARCHAR(50),
    duration_hours DECIMAL(4,1),
    syllabus_covered TEXT,
    difficulty VARCHAR(20),
    notes TEXT,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- 5. timetables
CREATE TABLE IF NOT EXISTS timetables (
    id UUID NOT NULL DEFAULT RANDOM_UUID(),
    student_id UUID,
    title VARCHAR(100),
    week_start_date DATE,
    is_ai_generated BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 6. timetable_slots
CREATE TABLE IF NOT EXISTS timetable_slots (
    id UUID NOT NULL DEFAULT RANDOM_UUID(),
    timetable_id UUID,
    subject_id UUID,
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
    slot_date DATE,
    start_time TIME,
    end_time TIME,
    topic VARCHAR(200),
    is_completed BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (timetable_id) REFERENCES timetables(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- 7. materials (V1 + V2 columns combined)
CREATE TABLE IF NOT EXISTS materials (
    id UUID NOT NULL DEFAULT RANDOM_UUID(),
    student_id UUID,
    subject_id UUID,
    title VARCHAR(200),
    file_name VARCHAR(255),
    file_url TEXT,
    file_type VARCHAR(50),
    material_type VARCHAR(50),
    file_size_bytes BIGINT,
    ai_summary TEXT,
    ai_categorized_subject VARCHAR(100),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- V2 columns
    processing_status VARCHAR(30) DEFAULT 'PENDING',
    extracted_topics TEXT,
    extracted_chapters TEXT,
    extracted_keywords TEXT,
    extracted_text TEXT,
    overall_difficulty VARCHAR(20),
    difficulty_score INTEGER,
    difficulty_reason TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
);

-- 8. subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID NOT NULL DEFAULT RANDOM_UUID(),
    student_id UUID,
    plan_type VARCHAR(50),
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    razorpay_subscription_id VARCHAR(100),
    amount_paise INTEGER,
    currency VARCHAR(10) DEFAULT 'INR',
    status VARCHAR(30),
    started_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_subscriptions_student UNIQUE (student_id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 9. chat_history
CREATE TABLE IF NOT EXISTS chat_history (
    id UUID NOT NULL DEFAULT RANDOM_UUID(),
    student_id UUID,
    session_id VARCHAR(100),
    role VARCHAR(20),
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 10. performance_snapshots
CREATE TABLE IF NOT EXISTS performance_snapshots (
    id UUID NOT NULL DEFAULT RANDOM_UUID(),
    student_id UUID,
    snapshot_date DATE,
    overall_percentage DECIMAL(5,2),
    study_hours_week DECIMAL(5,1),
    tasks_completed INTEGER,
    ai_recommendations TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- V3: study_rooms
CREATE TABLE IF NOT EXISTS study_rooms (
    id UUID NOT NULL DEFAULT RANDOM_UUID(),
    room_code VARCHAR(30) NOT NULL,
    owner_id UUID NOT NULL,
    subject_id UUID,
    subject_name VARCHAR(100),
    topic VARCHAR(200),
    duration_minutes INTEGER DEFAULT 50,
    max_participants INTEGER DEFAULT 4,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_study_rooms_code UNIQUE (room_code),
    FOREIGN KEY (owner_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
);

-- V3: study_room_participants
CREATE TABLE IF NOT EXISTS study_room_participants (
    id UUID NOT NULL DEFAULT RANDOM_UUID(),
    room_id UUID NOT NULL,
    student_id UUID NOT NULL,
    student_name VARCHAR(100),
    avatar_url TEXT,
    is_owner BOOLEAN DEFAULT false,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_room_student UNIQUE (room_id, student_id),
    FOREIGN KEY (room_id) REFERENCES study_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- V3: study_room_messages
CREATE TABLE IF NOT EXISTS study_room_messages (
    id UUID NOT NULL DEFAULT RANDOM_UUID(),
    room_id UUID NOT NULL,
    sender_id UUID,
    sender_name VARCHAR(100),
    message TEXT NOT NULL,
    is_ai BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (room_id) REFERENCES study_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES students(id) ON DELETE SET NULL
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_subjects_student_id ON subjects(student_id);
CREATE INDEX IF NOT EXISTS idx_marks_student_id ON marks(student_id);
CREATE INDEX IF NOT EXISTS idx_exams_student_id ON exams(student_id);
CREATE INDEX IF NOT EXISTS idx_timetables_student_id ON timetables(student_id);
CREATE INDEX IF NOT EXISTS idx_materials_student_id ON materials(student_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_student_id ON subscriptions(student_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_student_id ON chat_history(student_id);
CREATE INDEX IF NOT EXISTS idx_performance_snapshots_student_id ON performance_snapshots(student_id);
CREATE INDEX IF NOT EXISTS idx_students_firebase_uid ON students(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_marks_exam_date ON marks(exam_date);
CREATE INDEX IF NOT EXISTS idx_exams_exam_date ON exams(exam_date);
CREATE INDEX IF NOT EXISTS idx_materials_processing_status ON materials(processing_status);
CREATE INDEX IF NOT EXISTS idx_study_rooms_room_code ON study_rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_study_rooms_owner ON study_rooms(owner_id);
CREATE INDEX IF NOT EXISTS idx_study_rooms_status ON study_rooms(status);
CREATE INDEX IF NOT EXISTS idx_room_participants_room ON study_room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_room_messages_room ON study_room_messages(room_id);

-- ============================================================
-- SEED DEMO DATA FOR LOCAL FACULTY DEMONSTRATION
-- Insert-once: guarded by WHERE NOT EXISTS so re-running this script against the now file-based
-- (persistent) H2 database neither raises a duplicate-key error nor resets the demo student. Real
-- users are created on first login by their Firebase UID and are never touched by this seed.
-- ============================================================
INSERT INTO students (id, firebase_uid, full_name, email, college_name, department, semester, available_hours_per_day, is_premium, study_streak)
SELECT '123e4567-e89b-12d3-a456-426614174000', 'faculty-demo-uid', 'Faculty Demo Student', 'demo.student@university.edu', 'National Institute of Technology', 'Computer Science & Engineering', 6, 4.0, true, 5
WHERE NOT EXISTS (SELECT 1 FROM students WHERE firebase_uid = 'faculty-demo-uid');

