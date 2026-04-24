-- ============================================================
-- SEED DATA: Dashboard Demo (AI Strategy)
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. IDENTIFY THE USER
-- Replace the email below with your account email to target your specific user
-- Or just use the first user in the database if this is a fresh setup.
DO $$
DECLARE
    v_user_id UUID;
    v_subject_id UUID;
    v_session_date DATE;
    i INTEGER;
    minutes_array INTEGER[] := ARRAY[45, 120, 0, 90, 150, 60, 180]; -- Array for study minutes (Tue to Mon)
    mastery_array FLOAT[] := ARRAY[0.65, 0.72, 0.78, 0.82, 0.88, 0.92, 0.95]; -- Upward trend
BEGIN
    -- Get User ID (Updated for nh31097@gmail.com)
    v_user_id := 'f4982eec-8dcd-43cc-9399-44b5e9fa015a';
 
    -- 2. CREATE/FIND SUBJECT: "AI Strategy"
    INSERT INTO subjects (user_id, title, name, created_at)
    VALUES (v_user_id, 'AI Strategy', 'AI Strategy', NOW() - INTERVAL '30 days')
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_subject_id;
 
    IF v_subject_id IS NULL THEN
        SELECT id INTO v_subject_id FROM subjects WHERE user_id = v_user_id AND title = 'AI Strategy' LIMIT 1;
    END IF;
 
    -- 3. CLEAR OLD DEMO DATA
    -- Only clearing data for the last 8 days to avoid clutter while allowing fresh generation
    DELETE FROM study_sessions WHERE user_id = v_user_id AND subject_id = v_subject_id AND started_at >= CURRENT_DATE - INTERVAL '7 days';
    DELETE FROM quiz_attempts WHERE user_id = v_user_id AND subject_id = v_subject_id AND created_at >= CURRENT_DATE - INTERVAL '7 days';
 
    -- 4. INSERT 7 DAYS OF STUDY SESSIONS (Growth & Activity)
    -- We'll insert one session per day for the last 7 days.
    FOR i IN 0..6 LOOP
        v_session_date := (CURRENT_DATE - (6 - i)); -- Start from 6 days ago up to today
        
        -- The user requested specific behavior (e.g., Thu minutes: 0)
        -- Thu is usually 3-4 days ago depending on current day.
        -- We will use the minutes_array for variety.
        
        IF minutes_array[i+1] > 0 THEN
            INSERT INTO study_sessions (
                user_id, 
                subject_id, 
                session_title, 
                planned_minutes, 
                elapsed_seconds, 
                status, 
                started_at,
                created_at
            )
            VALUES (
                v_user_id, 
                v_subject_id, 
                'Deep Dive: AI Strategy Concepts', 
                60, 
                minutes_array[i+1] * 60, 
                'completed', 
                v_session_date + TIME '10:00:00',
                v_session_date + TIME '10:00:00'
            );
        END IF;
    END LOOP;
 
    -- 5. INSERT 7 DAYS OF QUIZ ATTEMPTS (Learning Performance)
    FOR i IN 0..6 LOOP
        v_session_date := (CURRENT_DATE - (6 - i));
        
        INSERT INTO quiz_attempts (
            user_id, 
            subject_id, 
            score, 
            total_questions, 
            created_at
        )
        VALUES (
            v_user_id, 
            v_subject_id, 
            (mastery_array[i+1] * 100)::INTEGER, 
            100, 
            v_session_date + TIME '16:00:00'
        );
    END LOOP;
 
    RAISE NOTICE 'Demo data populated successfully for User: %', v_user_id;
END $$;
