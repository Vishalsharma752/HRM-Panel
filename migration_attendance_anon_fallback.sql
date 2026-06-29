-- =============================================================================
-- Migration: Allow Anon Fallback UUID check-in/out
-- =============================================================================

-- Enable insert and update access for anon users using fallback UUID format
DROP POLICY IF EXISTS "allow_insert_anon_fallback" ON attendance;
CREATE POLICY "allow_insert_anon_fallback" ON attendance
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    employee_id::text LIKE '00000000-0000-0000-0000-%'
  );

DROP POLICY IF EXISTS "allow_update_anon_fallback" ON attendance;
CREATE POLICY "allow_update_anon_fallback" ON attendance
  FOR UPDATE TO anon, authenticated
  USING (
    employee_id::text LIKE '00000000-0000-0000-0000-%'
  );

DROP POLICY IF EXISTS "allow_select_anon_fallback" ON attendance;
CREATE POLICY "allow_select_anon_fallback" ON attendance
  FOR SELECT TO anon, authenticated
  USING (
    employee_id::text LIKE '00000000-0000-0000-0000-%'
  );
