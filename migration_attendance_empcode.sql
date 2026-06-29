-- =============================================================================
-- FIX: Add emp_code, fix NOT NULL constraints, disable RLS on attendance
-- Run this in Supabase Dashboard → SQL Editor → New Query → Run
-- =============================================================================

-- Step 1: Add emp_code TEXT column (safe if already exists)
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS emp_code TEXT;

-- Step 2: Make check_out and check_in nullable (they have NOT NULL constraints)
ALTER TABLE attendance ALTER COLUMN check_out DROP NOT NULL;
ALTER TABLE attendance ALTER COLUMN check_in DROP NOT NULL;

-- Step 3: Set default values for these columns
ALTER TABLE attendance ALTER COLUMN check_out SET DEFAULT '—';
ALTER TABLE attendance ALTER COLUMN check_in SET DEFAULT '—';

-- Step 4: Disable RLS so all employees can insert/update attendance
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;

-- Step 5: Grant full access to anon and authenticated roles
GRANT ALL ON attendance TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
