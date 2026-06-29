-- =============================================
-- Migration: Create Email Logs Table & RLS
-- =============================================

CREATE TABLE IF NOT EXISTS email_logs (
  id BIGSERIAL PRIMARY KEY,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_type TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row-Level Security
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Allow SELECT only for authenticated users with role Founder or Cofounder
DROP POLICY IF EXISTS "allow_admin_select_email_logs" ON email_logs;
CREATE POLICY "allow_admin_select_email_logs" ON email_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.official_email = auth.jwt()->>'email'
        AND (employees.role = 'Founder' OR employees.role = 'Cofounder')
    )
  );

-- Allow service role (backend calls) to insert logs (implicit bypass)
