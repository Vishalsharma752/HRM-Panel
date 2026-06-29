-- =============================================================================
-- Migration: Adjust Attendance RLS Policies for Local Fallback Support
-- =============================================================================

-- Drop existing restricted policies
DROP POLICY IF EXISTS "allow_select_attendance" ON attendance;
DROP POLICY IF EXISTS "allow_insert_own_attendance" ON attendance;
DROP POLICY IF EXISTS "allow_update_own_attendance" ON attendance;

-- Create policies that allow both anonymous (fallback session) and authenticated users
CREATE POLICY "allow_select_attendance_hybrid" ON attendance
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "allow_insert_attendance_hybrid" ON attendance
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "allow_update_attendance_hybrid" ON attendance
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);
