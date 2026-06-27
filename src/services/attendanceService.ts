import { supabase } from "../components/supabase";
import type { AttendanceRecord } from "../data/store";

/**
 * Fetch attendance records for a specific employee in a given month.
 */
export async function fetchMonthAttendance(
  employeeName: string,
  year: number,
  month: number
): Promise<AttendanceRecord[]> {
  try {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-31`;

    const { data, error } = await supabase
      .from("attendance")
      .select(`
        id,
        check_in,
        check_out,
        status,
        date,
        selfie_photo,
        lat,
        lng,
        location_status,
        distance_meters,
        check_in_time,
        check_out_time,
        check_out_lat,
        check_out_lng,
        check_out_distance_meters,
        check_out_location_status,
        employees!inner (
          id,
          full_name,
          department
        )
      `)
      .eq("employees.full_name", employeeName)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });

    if (error) throw error;

    if (!data) return [];

    return data.map((row: any) => {
      const emp = row.employees || {};
      const padId = String(emp.id || 0).padStart(3, "0");
      return {
        id: `EMP-${padId}`,
        name: emp.full_name || "Unknown",
        department: emp.department || "General",
        checkIn: row.check_in || "—",
        checkOut: row.check_out || "—",
        status: row.status || "Absent",
        avatar: "",
        date: row.date,
        selfiePhoto: row.selfie_photo,
        lat: row.lat ? parseFloat(row.lat) : undefined,
        lng: row.lng ? parseFloat(row.lng) : undefined,
        locationStatus: row.location_status,
        distanceMeters: row.distance_meters ? parseFloat(row.distance_meters) : undefined,
        checkInTime: row.check_in_time,
        checkOutTime: row.check_out_time,
        checkOutLat: row.check_out_lat ? parseFloat(row.check_out_lat) : undefined,
        checkOutLng: row.check_out_lng ? parseFloat(row.check_out_lng) : undefined,
        checkOutDistanceMeters: row.check_out_distance_meters ? parseFloat(row.check_out_distance_meters) : undefined,
        checkOutLocationStatus: row.check_out_location_status
      };
    });
  } catch (err) {
    console.error("fetchMonthAttendance failed:", err);
    return [];
  }
}
