-- =============================================================================
-- HRM Supabase Database Schema & RLS Setup
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Modify Existing Employees Table (Add Missing Columns)
-- -----------------------------------------------------------------------------
ALTER TABLE employees ADD COLUMN IF NOT EXISTS designation TEXT DEFAULT 'Employee';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'India';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS manager TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS salary NUMERIC;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS password TEXT DEFAULT 'Password123!';

-- -----------------------------------------------------------------------------
-- 2. Create Attendance Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance (
  id BIGSERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in TEXT DEFAULT '—',
  check_out TEXT DEFAULT '—',
  status TEXT DEFAULT 'Absent',
  selfie_photo TEXT,
  lat NUMERIC,
  lng NUMERIC,
  location_status TEXT,
  distance_meters NUMERIC,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  check_out_lat NUMERIC,
  check_out_lng NUMERIC,
  check_out_distance_meters NUMERIC,
  check_out_location_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_employee_date UNIQUE (employee_id, date)
);

-- -----------------------------------------------------------------------------
-- 3. Create Leave Requests Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_requests (
  id BIGSERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  days INTEGER NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4. Create Salary Structures Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS salary_structures (
  id BIGSERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE UNIQUE,
  basic_salary NUMERIC NOT NULL DEFAULT 0,
  hra NUMERIC DEFAULT 0,
  transport_allowance NUMERIC DEFAULT 0,
  medical_allowance NUMERIC DEFAULT 0,
  special_allowance NUMERIC DEFAULT 0,
  bonus NUMERIC DEFAULT 0,
  incentives NUMERIC DEFAULT 0,
  pf_deduction NUMERIC DEFAULT 0,
  professional_tax NUMERIC DEFAULT 0,
  income_tax NUMERIC DEFAULT 0,
  other_deductions NUMERIC DEFAULT 0,
  overtime_rate_per_hour NUMERIC DEFAULT 0,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 5. Create Payroll Records Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_records (
  id TEXT PRIMARY KEY, -- formatted string e.g. 'PR-YYYY-MM-EMP-ID'
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  month_label TEXT NOT NULL,
  working_days INTEGER NOT NULL,
  present_days INTEGER NOT NULL,
  absent_days INTEGER NOT NULL,
  paid_leave_days INTEGER NOT NULL,
  unpaid_leave_days INTEGER NOT NULL,
  overtime_hours NUMERIC NOT NULL,
  basic_salary NUMERIC NOT NULL,
  hra NUMERIC NOT NULL,
  transport_allowance NUMERIC NOT NULL,
  medical_allowance NUMERIC NOT NULL,
  special_allowance NUMERIC NOT NULL,
  bonus NUMERIC NOT NULL,
  incentives NUMERIC NOT NULL,
  overtime_pay NUMERIC NOT NULL,
  gross_salary NUMERIC NOT NULL,
  pf_deduction NUMERIC NOT NULL,
  professional_tax NUMERIC NOT NULL,
  income_tax NUMERIC NOT NULL,
  unpaid_leave_deduction NUMERIC NOT NULL,
  other_deductions NUMERIC NOT NULL,
  total_deductions NUMERIC NOT NULL,
  net_salary NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft',
  processed_by TEXT,
  processed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_mode TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 6. Helper Security-Invoker / Definer Functions
-- -----------------------------------------------------------------------------

-- Fetch the authenticated user's email from JWT
CREATE OR REPLACE FUNCTION get_current_user_email()
RETURNS TEXT AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'email',
    ''
  );
$$ LANGUAGE sql STABLE;

-- Fetch the integer employee ID based on official_email
CREATE OR REPLACE FUNCTION get_current_employee_id()
RETURNS INTEGER AS $$
  SELECT id FROM employees
  WHERE LOWER(official_email) = LOWER(get_current_user_email())
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if current authenticated user has an Admin/Founder/Cofounder role
CREATE OR REPLACE FUNCTION is_admin_or_founder()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM employees
    WHERE LOWER(official_email) = LOWER(get_current_user_email())
      AND role IN ('Admin', 'Founder', 'Cofounder')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 7. Enable Row-Level Security (RLS) and Define Policies
-- -----------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;

-- A. Policies for 'employees' table
DROP POLICY IF EXISTS "allow_select_employees" ON employees;
CREATE POLICY "allow_select_employees" ON employees
  FOR SELECT TO authenticated
  USING (is_admin_or_founder() OR LOWER(official_email) = LOWER(get_current_user_email()));

DROP POLICY IF EXISTS "allow_admin_manage_employees" ON employees;
CREATE POLICY "allow_admin_manage_employees" ON employees
  FOR ALL TO authenticated
  USING (is_admin_or_founder());

-- B. Policies for 'attendance' table
DROP POLICY IF EXISTS "allow_select_attendance" ON attendance;
CREATE POLICY "allow_select_attendance" ON attendance
  FOR SELECT TO authenticated
  USING (is_admin_or_founder() OR employee_id = get_current_employee_id());

DROP POLICY IF EXISTS "allow_insert_own_attendance" ON attendance;
CREATE POLICY "allow_insert_own_attendance" ON attendance
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_founder() OR employee_id = get_current_employee_id());

DROP POLICY IF EXISTS "allow_update_own_attendance" ON attendance;
CREATE POLICY "allow_update_own_attendance" ON attendance
  FOR UPDATE TO authenticated
  USING (is_admin_or_founder() OR employee_id = get_current_employee_id());

DROP POLICY IF EXISTS "allow_delete_attendance" ON attendance;
CREATE POLICY "allow_delete_attendance" ON attendance
  FOR DELETE TO authenticated
  USING (is_admin_or_founder());

-- C. Policies for 'leave_requests' table
DROP POLICY IF EXISTS "allow_select_leaves" ON leave_requests;
CREATE POLICY "allow_select_leaves" ON leave_requests
  FOR SELECT TO authenticated
  USING (is_admin_or_founder() OR employee_id = get_current_employee_id());

DROP POLICY IF EXISTS "allow_insert_leaves" ON leave_requests;
CREATE POLICY "allow_insert_leaves" ON leave_requests
  FOR INSERT TO authenticated
  WITH CHECK (employee_id = get_current_employee_id());

DROP POLICY IF EXISTS "allow_update_leaves" ON leave_requests;
CREATE POLICY "allow_update_leaves" ON leave_requests
  FOR UPDATE TO authenticated
  USING (is_admin_or_founder() OR (employee_id = get_current_employee_id() AND status = 'Pending'));

DROP POLICY IF EXISTS "allow_delete_leaves" ON leave_requests;
CREATE POLICY "allow_delete_leaves" ON leave_requests
  FOR DELETE TO authenticated
  USING (is_admin_or_founder() OR (employee_id = get_current_employee_id() AND status = 'Pending'));

-- D. Policies for 'salary_structures' table
DROP POLICY IF EXISTS "allow_select_structures" ON salary_structures;
CREATE POLICY "allow_select_structures" ON salary_structures
  FOR SELECT TO authenticated
  USING (is_admin_or_founder() OR employee_id = get_current_employee_id());

DROP POLICY IF EXISTS "allow_admin_manage_structures" ON salary_structures;
CREATE POLICY "allow_admin_manage_structures" ON salary_structures
  FOR ALL TO authenticated
  USING (is_admin_or_founder());

-- E. Policies for 'payroll_records' table
DROP POLICY IF EXISTS "allow_select_payroll" ON payroll_records;
CREATE POLICY "allow_select_payroll" ON payroll_records
  FOR SELECT TO authenticated
  USING (is_admin_or_founder() OR employee_id = get_current_employee_id());

DROP POLICY IF EXISTS "allow_admin_manage_payroll" ON payroll_records;
CREATE POLICY "allow_admin_manage_payroll" ON payroll_records
  FOR ALL TO authenticated
  USING (is_admin_or_founder());

-- -----------------------------------------------------------------------------
-- 8. Create Tasks Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  priority TEXT NOT NULL DEFAULT 'Medium',
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 9. Create Announcements Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS announcements (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- F. Policies for 'tasks' table
DROP POLICY IF EXISTS "allow_select_tasks" ON tasks;
CREATE POLICY "allow_select_tasks" ON tasks
  FOR SELECT TO authenticated
  USING (is_admin_or_founder() OR assigned_to = get_current_employee_id());

DROP POLICY IF EXISTS "allow_admin_manage_tasks" ON tasks;
CREATE POLICY "allow_admin_manage_tasks" ON tasks
  FOR ALL TO authenticated
  USING (is_admin_or_founder());

-- G. Policies for 'announcements' table
DROP POLICY IF EXISTS "allow_select_announcements" ON announcements;
CREATE POLICY "allow_select_announcements" ON announcements
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "allow_admin_manage_announcements" ON announcements;
CREATE POLICY "allow_admin_manage_announcements" ON announcements
  FOR ALL TO authenticated
  USING (is_admin_or_founder());
