-- ==============================================================================
-- MIGRATION: Restructure Attendance Model (Separation of Concerns)
-- Safe, idempotent script that adds shift_status, late penalty, and worked minutes
-- ==============================================================================

-- 1. Add new columns to attendance_records with safe defaults
ALTER TABLE IF EXISTS attendance_records 
  ADD COLUMN IF NOT EXISTS shift_status TEXT DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS scheduled_shift_start TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_shift_end TEXT,
  ADD COLUMN IF NOT EXISTS worked_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_penalty_eligible BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS late_penalty_status TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS late_penalty_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_penalty_reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS late_penalty_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS half_day_reason TEXT,
  ADD COLUMN IF NOT EXISTS adjusted_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- 2. Intelligent Backfill of existing records
-- (a) 'shift_completed' -> status = 'present', shift_status = 'completed'
UPDATE attendance_records 
SET status = 'present', shift_status = 'completed' 
WHERE status = 'shift_completed';

-- (b) 'late' -> status = 'present', late_minutes = 20, late_penalty_eligible = true, late_penalty_status = 'none'
UPDATE attendance_records 
SET status = 'present', 
    late_minutes = COALESCE(NULLIF(late_minutes, 0), 20), 
    late_penalty_eligible = true, 
    late_penalty_status = 'none' 
WHERE status = 'late';

-- (c) Active clock-in without clock-out -> shift_status = 'in_progress'
UPDATE attendance_records 
SET shift_status = 'in_progress' 
WHERE clock_in_time IS NOT NULL 
  AND clock_out_time IS NULL 
  AND (shift_status IS NULL OR shift_status = 'not_started');

-- (d) Clock-out exists -> shift_status = 'completed'
UPDATE attendance_records 
SET shift_status = 'completed' 
WHERE clock_out_time IS NOT NULL 
  AND (shift_status IS NULL OR shift_status = 'not_started' OR shift_status = 'in_progress');

-- (e) Ensure total_hours maps to worked_minutes if 0
UPDATE attendance_records
SET worked_minutes = ROUND(total_hours * 60)
WHERE (worked_minutes IS NULL OR worked_minutes = 0) AND total_hours IS NOT NULL AND total_hours > 0;
