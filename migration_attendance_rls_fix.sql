-- =============================================================================
-- CRITICAL FIX: Disable RLS on attendance table
-- Run this in Supabase Dashboard → SQL Editor → New Query → Run
-- =============================================================================

-- Completely disable row-level security on attendance table
-- Access control is handled in application logic
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;

-- Also grant full access to anon and authenticated roles
GRANT ALL ON attendance TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
