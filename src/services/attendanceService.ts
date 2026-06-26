import type { AttendanceRecord } from "../data/store";

const STORE_PREFIX = "hrms_store_";

/**
 * Fetch attendance records for a specific employee in a given month.
 *
 * ─── Supabase migration guide ──────────────────────────────────────────────
 * 1. Install: npm install @supabase/supabase-js
 * 2. Replace this function body with:
 *
 *   import { createClient } from "@supabase/supabase-js";
 *   const supabase = createClient(
 *     import.meta.env.VITE_SUPABASE_URL,
 *     import.meta.env.VITE_SUPABASE_ANON_KEY
 *   );
 *   const startDate = `${year}-${String(month).padStart(2,"0")}-01`;
 *   const endDate   = `${year}-${String(month).padStart(2,"0")}-31`;
 *   const { data } = await supabase
 *     .from("attendance")
 *     .select("employee_id, date, check_in, check_out, status")
 *     .eq("employee_id", employeeId)
 *     .gte("date", startDate)
 *     .lte("date", endDate)
 *     .order("date", { ascending: true });
 *   return data ?? [];
 *
 * ──────────────────────────────────────────────────────────────────────────
 *
 * @param employeeName  Display name matching the `name` field in localStorage
 * @param year          4-digit year (e.g., 2026)
 * @param month         1-indexed month (1 = Jan ... 12 = Dec)
 */
export async function fetchMonthAttendance(
  employeeName: string,
  year: number,
  month: number
): Promise<AttendanceRecord[]> {
  try {
    const raw = localStorage.getItem(`${STORE_PREFIX}attendance`);
    if (!raw) return [];
    const all: AttendanceRecord[] = JSON.parse(raw);
    const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
    return all.filter(
      (r) => r.name === employeeName && r.date?.startsWith(monthPrefix)
    );
  } catch {
    return [];
  }
}
