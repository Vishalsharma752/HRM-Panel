-- =============================================
-- Migration: Create Password Resets Table
-- =============================================

CREATE TABLE IF NOT EXISTS password_resets (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row-Level Security
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone (anonymous and authenticated) to insert reset tokens
DROP POLICY IF EXISTS "allow_anon_insert_resets" ON password_resets;
CREATE POLICY "allow_anon_insert_resets" ON password_resets
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Policy: Allow anyone to query a reset token to check its validity
DROP POLICY IF EXISTS "allow_anon_select_resets" ON password_resets;
CREATE POLICY "allow_anon_select_resets" ON password_resets
  FOR SELECT TO anon, authenticated
  USING (true);

-- Policy: Allow anyone to update a reset token (to mark it as used)
DROP POLICY IF EXISTS "allow_anon_update_resets" ON password_resets;
CREATE POLICY "allow_anon_update_resets" ON password_resets
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);
