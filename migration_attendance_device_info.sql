-- =============================================
-- Migration: Add IP and Device Tracking to Attendance
-- =============================================

ALTER TABLE attendance ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS device_info TEXT;
