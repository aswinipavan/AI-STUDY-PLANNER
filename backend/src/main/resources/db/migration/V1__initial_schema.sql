-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. students
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    phone_number VARCHAR(20) UNIQUE,
    full_name VARCHAR(100),
    email VARCHAR(150),
    college_name VARCHAR(200),
    semester INTEGER,
    department VARCHAR(100),
    available_hours_per_day DECIMAL(4,1) DEFAULT 4.0,
    is_premium BOOLEAN DEFAULT false,
    study_streak INTEGER DEFAULT 0,
    last_active_date DATE,
    profile_picture_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add updated_at trigger to students
CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. subjects
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    subject_name VARCHAR(100) NOT NULL,
    subject_code VARCHAR(20),
    credits INTEGER,
    difficulty_level INTEGER DEFAULT 3 CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
    semester INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. marks
CREATE TABLE marks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    exam_type VARCHAR(50),
    marks_obtained DECIMAL(6,2),
    total_marks DECIMAL(6,2),
    percentage DECIMAL(5,2),
    exam_date DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. exams
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    exam_name VARCHAR(100),
    exam_date DATE NOT NULL,
    exam_type VARCHAR(50),
    duration_hours DECIMAL(4,1),
    syllabus_covered TEXT,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. timetables
CREATE TABLE timetables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    title VARCHAR(100),
    week_start_date DATE,
    is_ai_generated BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. timetable_slots
CREATE TABLE timetable_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timetable_id UUID REFERENCES timetables(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME,
    end_time TIME,
    topic VARCHAR(200),
    is_completed BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. materials
CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    file_name VARCHAR(255),
    file_url TEXT,
    file_type VARCHAR(50),
    file_size_bytes BIGINT,
    ai_summary TEXT,
    ai_categorized_subject VARCHAR(100),
    upload_date TIMESTAMPTZ DEFAULT now()
);

-- 8. subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID UNIQUE REFERENCES students(id) ON DELETE CASCADE,
    plan_type VARCHAR(50),
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    razorpay_subscription_id VARCHAR(100),
    amount_paise INTEGER,
    currency VARCHAR(10) DEFAULT 'INR',
    status VARCHAR(30),
    started_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. chat_history
CREATE TABLE chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    session_id VARCHAR(100),
    role VARCHAR(20),
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. performance_snapshots
CREATE TABLE performance_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    snapshot_date DATE,
    overall_percentage DECIMAL(5,2),
    study_hours_week DECIMAL(5,1),
    tasks_completed INTEGER,
    ai_recommendations TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- INDEXES
-- ==========================================

-- student_id columns
CREATE INDEX idx_subjects_student_id ON subjects(student_id);
CREATE INDEX idx_marks_student_id ON marks(student_id);
CREATE INDEX idx_exams_student_id ON exams(student_id);
CREATE INDEX idx_timetables_student_id ON timetables(student_id);
CREATE INDEX idx_materials_student_id ON materials(student_id);
CREATE INDEX idx_subscriptions_student_id ON subscriptions(student_id);
CREATE INDEX idx_chat_history_student_id ON chat_history(student_id);
CREATE INDEX idx_performance_snapshots_student_id ON performance_snapshots(student_id);

-- other required indexes
CREATE INDEX idx_students_firebase_uid ON students(firebase_uid);
CREATE INDEX idx_marks_exam_date ON marks(exam_date);
CREATE INDEX idx_exams_exam_date ON exams(exam_date);

-- created_at indexes
CREATE INDEX idx_students_created_at ON students(created_at);
CREATE INDEX idx_subjects_created_at ON subjects(created_at);
CREATE INDEX idx_marks_created_at ON marks(created_at);
CREATE INDEX idx_exams_created_at ON exams(created_at);
CREATE INDEX idx_timetables_created_at ON timetables(created_at);
CREATE INDEX idx_timetable_slots_created_at ON timetable_slots(created_at);
CREATE INDEX idx_subscriptions_created_at ON subscriptions(created_at);
CREATE INDEX idx_chat_history_created_at ON chat_history(created_at);
CREATE INDEX idx_performance_snapshots_created_at ON performance_snapshots(created_at);


-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_snapshots ENABLE ROW LEVEL SECURITY;

-- Note: These policies use Supabase's auth.uid() function. 
-- In a scenario where Firebase auth is used, you might map firebase_uid via request.jwt.claims.
-- Here we support both auth.uid() matching the UUID and custom sub/user_id from a JWT matching firebase_uid.

CREATE POLICY "Student access own record" ON students FOR ALL 
USING (
    id = auth.uid() OR 
    firebase_uid = (current_setting('request.jwt.claims', true)::json->>'sub') OR
    firebase_uid = (current_setting('request.jwt.claims', true)::json->>'user_id')
);

CREATE POLICY "Subject access own record" ON subjects FOR ALL 
USING (
    student_id = auth.uid() OR 
    student_id IN (SELECT id FROM students WHERE firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub' OR firebase_uid = current_setting('request.jwt.claims', true)::json->>'user_id')
);

CREATE POLICY "Marks access own record" ON marks FOR ALL 
USING (
    student_id = auth.uid() OR 
    student_id IN (SELECT id FROM students WHERE firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub' OR firebase_uid = current_setting('request.jwt.claims', true)::json->>'user_id')
);

CREATE POLICY "Exams access own record" ON exams FOR ALL 
USING (
    student_id = auth.uid() OR 
    student_id IN (SELECT id FROM students WHERE firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub' OR firebase_uid = current_setting('request.jwt.claims', true)::json->>'user_id')
);

CREATE POLICY "Timetables access own record" ON timetables FOR ALL 
USING (
    student_id = auth.uid() OR 
    student_id IN (SELECT id FROM students WHERE firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub' OR firebase_uid = current_setting('request.jwt.claims', true)::json->>'user_id')
);

CREATE POLICY "Timetable_slots access own record" ON timetable_slots FOR ALL 
USING (
    timetable_id IN (
        SELECT id FROM timetables WHERE student_id = auth.uid() OR 
        student_id IN (SELECT id FROM students WHERE firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub' OR firebase_uid = current_setting('request.jwt.claims', true)::json->>'user_id')
    )
);

CREATE POLICY "Materials access own record" ON materials FOR ALL 
USING (
    student_id = auth.uid() OR 
    student_id IN (SELECT id FROM students WHERE firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub' OR firebase_uid = current_setting('request.jwt.claims', true)::json->>'user_id')
);

CREATE POLICY "Subscriptions access own record" ON subscriptions FOR ALL 
USING (
    student_id = auth.uid() OR 
    student_id IN (SELECT id FROM students WHERE firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub' OR firebase_uid = current_setting('request.jwt.claims', true)::json->>'user_id')
);

CREATE POLICY "Chat history access own record" ON chat_history FOR ALL 
USING (
    student_id = auth.uid() OR 
    student_id IN (SELECT id FROM students WHERE firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub' OR firebase_uid = current_setting('request.jwt.claims', true)::json->>'user_id')
);

CREATE POLICY "Performance access own record" ON performance_snapshots FOR ALL 
USING (
    student_id = auth.uid() OR 
    student_id IN (SELECT id FROM students WHERE firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub' OR firebase_uid = current_setting('request.jwt.claims', true)::json->>'user_id')
);
