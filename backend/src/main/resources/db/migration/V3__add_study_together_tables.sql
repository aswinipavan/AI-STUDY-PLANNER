-- ==========================================================
-- V3: Add Study Together Collaborative Study Rooms
-- ==========================================================
-- Fully idempotent. The Study Together tables were originally created directly in
-- Supabase during development, before this migration existed, so on the production
-- database every object below already exists. Flyway still runs V3 there because
-- `spring.flyway.baseline-on-migrate=true` baselines the pre-existing schema at
-- version 1 and then applies V2..V6 on top of it.
--
-- Every statement here is therefore written to be safe on both a fresh database and
-- one that already has these objects. `CREATE TABLE`/`CREATE INDEX` use
-- `IF NOT EXISTS`; `ENABLE ROW LEVEL SECURITY` is a no-op when RLS is already on;
-- and the policies are guarded by `pg_policies` lookups because PostgreSQL has no
-- `CREATE POLICY ... IF NOT EXISTS`.

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

-- ----------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------
-- ENABLE ROW LEVEL SECURITY is naturally idempotent: re-enabling it on a table that
-- already has RLS on is a no-op, not an error. RLS is never disabled here.
ALTER TABLE study_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_room_messages ENABLE ROW LEVEL SECURITY;

-- PostgreSQL has no `CREATE POLICY ... IF NOT EXISTS`, so each policy is created only
-- when pg_policies shows it is absent. Behaviour per policy:
--   * missing  -> created exactly as written below
--   * present  -> left completely untouched; a WARNING is raised if its definition has
--                 drifted from the intended one, so the divergence shows up in the
--                 deploy log instead of passing silently
--
-- Deliberately NOT `DROP POLICY IF EXISTS ...; CREATE POLICY ...`. That would force the
-- definition, but it would also silently overwrite a policy that had been tightened by
-- hand in production — i.e. it could weaken live security. Reporting drift is the safer
-- trade-off; nothing in this block ever drops, alters or relaxes an existing policy.

DO $$
DECLARE
    v_cmd  text;
    v_qual text;
BEGIN
    SELECT cmd, qual INTO v_cmd, v_qual
      FROM pg_policies
     WHERE schemaname = current_schema()
       AND tablename  = 'study_rooms'
       AND policyname = 'Study room read access';

    IF NOT FOUND THEN
        CREATE POLICY "Study room read access" ON study_rooms FOR SELECT USING (true);
    ELSIF v_cmd <> 'SELECT' OR v_qual IS DISTINCT FROM 'true' THEN
        RAISE WARNING 'V3: policy "Study room read access" on study_rooms already exists with a different definition (cmd=%, using=%); left unchanged.', v_cmd, v_qual;
    END IF;
END
$$;

DO $$
DECLARE
    v_cmd  text;
    v_qual text;
BEGIN
    SELECT cmd, qual INTO v_cmd, v_qual
      FROM pg_policies
     WHERE schemaname = current_schema()
       AND tablename  = 'study_room_participants'
       AND policyname = 'Study room participant access';

    IF NOT FOUND THEN
        CREATE POLICY "Study room participant access" ON study_room_participants FOR ALL USING (true);
    ELSIF v_cmd <> 'ALL' OR v_qual IS DISTINCT FROM 'true' THEN
        RAISE WARNING 'V3: policy "Study room participant access" on study_room_participants already exists with a different definition (cmd=%, using=%); left unchanged.', v_cmd, v_qual;
    END IF;
END
$$;

DO $$
DECLARE
    v_cmd  text;
    v_qual text;
BEGIN
    SELECT cmd, qual INTO v_cmd, v_qual
      FROM pg_policies
     WHERE schemaname = current_schema()
       AND tablename  = 'study_room_messages'
       AND policyname = 'Study room messages access';

    IF NOT FOUND THEN
        CREATE POLICY "Study room messages access" ON study_room_messages FOR ALL USING (true);
    ELSIF v_cmd <> 'ALL' OR v_qual IS DISTINCT FROM 'true' THEN
        RAISE WARNING 'V3: policy "Study room messages access" on study_room_messages already exists with a different definition (cmd=%, using=%); left unchanged.', v_cmd, v_qual;
    END IF;
END
$$;
