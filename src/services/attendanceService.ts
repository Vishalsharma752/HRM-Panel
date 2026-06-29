import { supabase } from "../components/supabase";
import type { AttendanceRecord } from "../data/store";

/**
 * Fetch attendance records for a specific employee in a given month.
 * Uses emp_code (TEXT) — matches the attendance table's actual identifier.
 */
export async function fetchMonthAttendance(
  employeeName: string,
  year: number,
  month: number
): Promise<AttendanceRecord[]> {
  try {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-31`;

    // 1. Resolve employee emp_code from the employees table by name
    const { data: empData, error: empErr } = await supabase
      .from("employees")
      .select("id, emp_code")
      .ilike("full_name", employeeName.trim())
      .maybeSingle();

    if (empErr) {
      console.warn("fetchMonthAttendance: employee lookup failed:", empErr.message);
      return [];
    }

    if (!empData?.emp_code) {
      console.warn("fetchMonthAttendance: no emp_code found for", employeeName);
      return [];
    }

    const empCode = empData.emp_code;
    const rawId = String(empData.id).padStart(3, "0");

    // 2. Fetch attendance rows using emp_code (TEXT)
    const { data, error } = await supabase
      .from("attendance")
      .select("id, emp_code, attendance_date, check_in, check_out, status")
      .eq("emp_code", empCode)
      .gte("attendance_date", startDate)
      .lte("attendance_date", endDate)
      .order("attendance_date", { ascending: true });

    if (error) throw error;
    if (!data) return [];

    return data.map((row: any) => ({
      id: row.id,
      empId: `EMP-${rawId}`,
      name: employeeName.trim(),
      department: "General",
      checkIn: row.check_in || "—",
      checkOut: row.check_out || "—",
      status: (row.status || "Present") as AttendanceRecord["status"],
      avatar: "",
      date: row.attendance_date,
      checkInTime: (row.attendance_date && row.check_in && row.check_in !== "—")
        ? `${row.attendance_date}T${row.check_in}` : undefined,
      checkOutTime: (row.attendance_date && row.check_out && row.check_out !== "—")
        ? `${row.attendance_date}T${row.check_out}` : undefined,
    }));
  } catch (err) {
    console.error("fetchMonthAttendance failed:", err);
    return [];
  }
}
