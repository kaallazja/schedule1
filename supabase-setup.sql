-- ===================================================================
--  STUDY PLANNER — Supabase Schema + RLS Setup
-- ===================================================================
--  Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ===================================================================

-- Create the study_schedules table
CREATE TABLE IF NOT EXISTS study_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  subject TEXT NOT NULL,
  day TEXT NOT NULL CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  notes TEXT DEFAULT '',
  color TEXT DEFAULT '#6366f1',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  materials JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster queries by user and day
CREATE INDEX IF NOT EXISTS idx_study_schedules_user_day
  ON study_schedules (user_id, day);

-- Enable Row Level Security
ALTER TABLE study_schedules ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (safe to re-run)
DROP POLICY IF EXISTS "Users manage their own schedules" ON study_schedules;

-- Create RLS policy: users can only see/manage their own data
CREATE POLICY "Users manage their own schedules"
  ON study_schedules
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ===================================================================
--  DONE! The table is ready.
-- ===================================================================
--  Now create 3 test accounts:
--    1. Open Authentication → Users in your Supabase dashboard
--    2. Click "Add User" for each:
--         student1@test.com  /  password123
--         student2@test.com  /  password123
--         student3@test.com  /  password123
--    3. Or disable email confirmation in Authentication → Settings
--       and sign up directly from the app.
-- ===================================================================
