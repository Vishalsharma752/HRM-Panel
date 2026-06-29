-- =============================================================================
-- Migration: Add emp_code column to attendance table
-- =============================================================================

ALTER TABLE attendance ADD COLUMN IF NOT EXISTS emp_code TEXT;

-- Seed existing rows: set emp_code to employee_id if it matches numeric format
UPDATE attendance
SET emp_code = TRIM(BOTH '"' FROM employee_id::text)
WHERE employee_id IS NOT NULL AND emp_code IS NULL;
