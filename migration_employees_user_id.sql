-- =============================================================================
-- Migration: Add user_id UUID link to employees table
-- =============================================================================

ALTER TABLE employees ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
