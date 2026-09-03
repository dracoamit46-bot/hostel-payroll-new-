-- Migration: Add missing Split Shift columns

-- 1. Add split shift configuration to users table
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS shift_1_start TEXT,
  ADD COLUMN IF NOT EXISTS shift_1_end TEXT,
  ADD COLUMN IF NOT EXISTS shift_2_start TEXT,
  ADD COLUMN IF NOT EXISTS shift_2_end TEXT;

-- 2. Add split shift data points to attendance_records table
ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS shift_1_clock_in_time TEXT,
  ADD COLUMN IF NOT EXISTS shift_1_clock_in_selfie_url TEXT,
  ADD COLUMN IF NOT EXISTS shift_1_clock_in_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS shift_1_clock_in_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS shift_1_clock_in_accuracy DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS shift_1_clock_in_address TEXT,
  
  ADD COLUMN IF NOT EXISTS shift_1_clock_out_time TEXT,
  ADD COLUMN IF NOT EXISTS shift_1_clock_out_selfie_url TEXT,
  ADD COLUMN IF NOT EXISTS shift_1_clock_out_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS shift_1_clock_out_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS shift_1_clock_out_accuracy DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS shift_1_clock_out_address TEXT,
  
  ADD COLUMN IF NOT EXISTS shift_1_worked_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shift_1_late_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shift_1_status TEXT DEFAULT 'not_started',
  
  ADD COLUMN IF NOT EXISTS shift_2_clock_in_time TEXT,
  ADD COLUMN IF NOT EXISTS shift_2_clock_in_selfie_url TEXT,
  ADD COLUMN IF NOT EXISTS shift_2_clock_in_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS shift_2_clock_in_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS shift_2_clock_in_accuracy DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS shift_2_clock_in_address TEXT,
  
  ADD COLUMN IF NOT EXISTS shift_2_clock_out_time TEXT,
  ADD COLUMN IF NOT EXISTS shift_2_clock_out_selfie_url TEXT,
  ADD COLUMN IF NOT EXISTS shift_2_clock_out_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS shift_2_clock_out_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS shift_2_clock_out_accuracy DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS shift_2_clock_out_address TEXT,
  
  ADD COLUMN IF NOT EXISTS shift_2_worked_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shift_2_late_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shift_2_status TEXT DEFAULT 'not_started';
