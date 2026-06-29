-- =============================================================================
-- Migration: Re-restrict Attendance RLS Policies to Authenticated Users
-- =============================================================================

-- Drop relaxed/hybrid policies
DROP POLICY IF EXISTS "allow_select_attendance_hybrid" ON attendance;
DROP POLICY IF EXISTS "allow_insert_attendance_hybrid" ON attendance;
DROP POLICY IF EXISTS "allow_update_attendance_hybrid" ON attendance;

DROP POLICY IF EXISTS "allow_select_attendance" ON attendance;
DROP POLICY IF EXISTS "allow_insert_own_attendance" ON attendance;
DROP POLICY IF EXISTS "allow_update_own_attendance" ON attendance;

-- Create secure policies matching auth.uid() directly
CREATE POLICY "allow_select_attendance_secure" ON attendance
  FOR SELECT TO authenticated
  USING (
    emp_code = (SELECT TRIM(BOTH '"' FROM (auth.jwt()->>'sub')::text)) OR
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.official_email = auth.jwt()->>'email'
        AND (employees.role = 'Admin' OR employees.role = 'Founder' OR employees.role = 'Cofounder')
    )
  );

CREATE POLICY "allow_insert_attendance_secure" ON attendance
  FOR INSERT TO authenticated
  WITH CHECK (
    emp_code = (SELECT TRIM(BOTH '"' FROM (auth.jwt()->>'sub')::text))
  );

CREATE POLICY "allow_update_attendance_secure" ON attendance
  FOR UPDATE TO authenticated
  USING (
    emp_code = (SELECT TRIM(BOTH '"' FROM (auth.jwt()->>'sub')::text)) OR
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.official_email = auth.jwt()->>'email'
        AND (employees.role = 'Admin' OR employees.role = 'Founder' OR employees.role = 'Cofounder')
    )
  );
