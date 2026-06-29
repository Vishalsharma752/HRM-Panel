-- ==========================================
-- Migration: Add Missing Columns to Employees
-- ==========================================

-- 1. Add missing designation column
ALTER TABLE employees ADD COLUMN IF NOT EXISTS designation TEXT DEFAULT 'Employee';

-- 2. Add missing location column
ALTER TABLE employees ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'India';

-- 3. Add missing manager column
ALTER TABLE employees ADD COLUMN IF NOT EXISTS manager TEXT;

-- 4. Add missing salary column
ALTER TABLE employees ADD COLUMN IF NOT EXISTS salary NUMERIC;

-- 5. Add missing password column
ALTER TABLE employees ADD COLUMN IF NOT EXISTS password TEXT DEFAULT 'Password123!';
