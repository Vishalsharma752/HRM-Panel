import { useState, useEffect, useCallback } from "react";
import { 
  employees as initialEmployees,
  leaveRequests as initialLeaves, 
  attendanceToday as initialAttendance,
  notifications as initialNotifications,
  recentActivities as initialActivities,
  type Employee 
} from "./employees";
import { getInitialPayrollData } from "./payrollStore";
import { supabase } from "../components/supabase";

export type Role = "Admin" | "Employee" | "Founder" | "Cofounder";

/** Returns true if the role has admin-level access */
export function isAdminRole(role: Role): boolean {
  return role === "Admin" || role === "Founder" || role === "Cofounder";
}

export interface SyncedEmployee extends Omit<Employee, "role"> {
  role: Role;
  password?: string;
}

export interface Holiday {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  type: "National" | "Company" | "Optional" | "Festival";
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter.";
  }
  if (!/[0-9\W]/.test(password)) {
    return "Password must contain at least one number or symbol.";
  }
  return null;
}

export interface LeaveRequest {
  id: string;
  employee: string;
  department: string;
  type: string;
  from: string;
  to: string;
  days: number;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  avatar?: string;
}

export interface AttendanceRecord {
  id: string;
  name: string;
  department: string;
  checkIn: string;
  checkOut: string;
  status: "Present" | "Absent" | "On Leave" | "Late" | "Off";
  avatar?: string;
  date?: string; // YYYY-MM-DD
  // Secure attendance fields
  selfiePhoto?: string;           // base64 JPEG data URL
  lat?: number;                   // GPS latitude at check-in
  lng?: number;                   // GPS longitude at check-in
  locationStatus?: "Verified" | "Outside Office" | "Unknown";
  distanceMeters?: number;        // metres from office at check-in
  checkOutTime?: string;          // ISO string for accurate work-hours calculation
  checkInTime?: string;           // ISO string for accurate work-hours calculation
  checkOutLat?: number;
  checkOutLng?: number;
  checkOutDistanceMeters?: number;
  checkOutLocationStatus?: "Verified" | "Outside Office" | "Unknown";
}


export interface NotificationRecord {
  id: number;
  type: string;
  title: string;
  time: string;
  unread: boolean;
  icon: string;
}

export interface ActivityRecord {
  id: number;
  user: string;
  action: string;
  target: string;
  time: string;
  avatar?: string;
}

// Session keys
const SESSION_USER_KEY = "hrms_current_user";
const STORE_PREFIX = "hrms_store_";

function getSafeParsed<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    const val = JSON.parse(raw);
    if (val === null || val === undefined) return fallback;
    if (Array.isArray(fallback) && !Array.isArray(val)) return fallback;
    return val;
  } catch {
    return fallback;
  }
}

export const initStorage = () => {
  if (typeof window === "undefined") return;

  // 1. Employees
  const defaultEmployees: SyncedEmployee[] = initialEmployees.map(emp => ({
    ...emp,
    role: (emp.role === "Admin" || emp.role === "HR" || emp.role === "Manager") ? "Admin" : "Employee",
    password: "Password123!"
  }));
  const currentEmployees = getSafeParsed(`${STORE_PREFIX}employees`, defaultEmployees);
  localStorage.setItem(`${STORE_PREFIX}employees`, JSON.stringify(currentEmployees));

  // 2. Tasks — default to empty; real tasks are created by users at runtime.
  // Version stamp: bump TASKS_CLEAR_VERSION to force-wipe stale localStorage data.
  const TASKS_CLEAR_VERSION = "v2";
  const clearedVersion = localStorage.getItem("hrms_tasks_cleared");
  if (clearedVersion !== TASKS_CLEAR_VERSION) {
    // Wipe both legacy and current task keys so dummy data cannot persist
    localStorage.removeItem("hrms_tasks");
    localStorage.removeItem(`${STORE_PREFIX}tasks`);
    localStorage.setItem("hrms_tasks_cleared", TASKS_CLEAR_VERSION);
  }
  const currentTasks = getSafeParsed(`${STORE_PREFIX}tasks`, []);
  localStorage.setItem(`${STORE_PREFIX}tasks`, JSON.stringify(currentTasks));

  // 3. Leaves
  const currentLeaves = getSafeParsed(`${STORE_PREFIX}leaves`, initialLeaves);
  localStorage.setItem(`${STORE_PREFIX}leaves`, JSON.stringify(currentLeaves));

  // 4. Attendance
  const currentAttendance = getSafeParsed(`${STORE_PREFIX}attendance`, initialAttendance);
  localStorage.setItem(`${STORE_PREFIX}attendance`, JSON.stringify(currentAttendance));

  // 5. Notifications
  const currentNotifications = getSafeParsed(`${STORE_PREFIX}notifications_v2`, initialNotifications);
  localStorage.setItem(`${STORE_PREFIX}notifications_v2`, JSON.stringify(currentNotifications));

  // 6. Activities
  const currentActivities = getSafeParsed(`${STORE_PREFIX}activities`, initialActivities);
  localStorage.setItem(`${STORE_PREFIX}activities`, JSON.stringify(currentActivities));

  // 7. Payroll structures & records
  const { structures: defaultStructures, records: defaultRecords } = getInitialPayrollData();
  const currentStructures = getSafeParsed(`${STORE_PREFIX}payroll_structures`, defaultStructures);
  const currentRecords = getSafeParsed(`${STORE_PREFIX}payroll_records`, defaultRecords);
  localStorage.setItem(`${STORE_PREFIX}payroll_structures`, JSON.stringify(currentStructures));
  localStorage.setItem(`${STORE_PREFIX}payroll_records`, JSON.stringify(currentRecords));

  // 8. Holidays
  const defaultHolidays: Holiday[] = [
    { id: "HOL-001", title: "New Year's Day", description: "First day of the year", date: "2026-01-01", type: "Company" },
    { id: "HOL-002", title: "Republic Day", description: "National celebration of Republic Day", date: "2026-01-26", type: "National" },
    { id: "HOL-003", title: "Maha Shivratri", description: "Festival dedicated to Lord Shiva", date: "2026-02-15", type: "Festival" },
    { id: "HOL-004", title: "Holi", description: "Festival of colors and spring", date: "2026-03-04", type: "Festival" },
    { id: "HOL-005", title: "Good Friday", description: "Christian holiday observing the crucifixion", date: "2026-04-03", type: "Optional" },
    { id: "HOL-006", title: "Eid ul-Fitr", description: "Islamic festival of breaking the fast", date: "2026-04-10", type: "Festival" },
    { id: "HOL-007", title: "Independence Day", description: "National celebration of India's independence", date: "2026-08-15", type: "National" },
    { id: "HOL-008", title: "Gandhi Jayanti", description: "Birthday of Mahatma Gandhi", date: "2026-10-02", type: "National" },
    { id: "HOL-009", title: "Diwali", description: "Festival of lights", date: "2026-11-08", type: "Festival" },
    { id: "HOL-010", title: "Christmas Day", description: "Christian festival celebrating the birth of Jesus Christ", date: "2026-12-25", type: "National" },
  ];
  const currentHolidays = getSafeParsed(`${STORE_PREFIX}holidays`, defaultHolidays);
  localStorage.setItem(`${STORE_PREFIX}holidays`, JSON.stringify(currentHolidays));

  // 9. Attendance queries
  const currentQueries = getSafeParsed("hrms_store_attendance_queries", []);
  localStorage.setItem("hrms_store_attendance_queries", JSON.stringify(currentQueries));
};

// Generic storage syncing state hook
export function useStore<T>(keySuffix: string, defaultValue: T): [T, (val: T | ((prev: T) => T)) => void] {
  const fullKey = `${STORE_PREFIX}${keySuffix}`;

  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;
    const stored = localStorage.getItem(fullKey);
    return stored ? JSON.parse(stored) : defaultValue;
  });

  const setStore = useCallback((val: T | ((prev: T) => T)) => {
    setState((prev) => {
      const nextVal = typeof val === "function" ? (val as Function)(prev) : val;
      setTimeout(() => {
        try {
          localStorage.setItem(fullKey, JSON.stringify(nextVal));
          window.dispatchEvent(new Event("storage-sync"));
        } catch (e) {
          console.error("Failed to write to localStorage in useStore:", e);
        }
      }, 0);
      return nextVal;
    });
  }, [fullKey]);

  useEffect(() => {
    const handleSync = () => {
      const stored = localStorage.getItem(fullKey);
      if (stored) {
        setState(JSON.parse(stored));
      }
    };
    window.addEventListener("storage", handleSync);
    window.addEventListener("storage-sync", handleSync);
    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("storage-sync", handleSync);
    };
  }, [fullKey]);

  return [state, setStore];
}

// Authentication handlers
export const getCurrentUser = (): SyncedEmployee | null => {
  if (typeof window === "undefined") return null;
  const userJson = sessionStorage.getItem(SESSION_USER_KEY);
  return userJson ? JSON.parse(userJson) : null;
};

export const setCurrentUserSession = (user: SyncedEmployee | null) => {
  if (typeof window === "undefined") return;
  if (user) {
    sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(SESSION_USER_KEY);
  }
};

// Avatar generator helper
function getAvatar(name: string, bg1: string, bg2: string): string {
  const initials = name.split(" ").map((p: string) => p[0]).slice(0, 2).join("").toUpperCase();
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${bg1}"/><stop offset="100%" stop-color="${bg2}"/></linearGradient></defs><rect width="80" height="80" rx="40" fill="url(#g)"/><text x="50%" y="54%" text-anchor="middle" font-family="Inter, sans-serif" font-size="28" font-weight="700" fill="white" dominant-baseline="middle">${initials}</text></svg>`
  )}`;
}

// Supabase fetch employee list and local storage sync hook
// Returns [employees, loading, error, refetch]
export function useSupabaseEmployees(): [SyncedEmployee[], boolean, string | null, () => Promise<void>] {
  const [, setStoredEmployees] = useStore<SyncedEmployee[]>("employees", []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const CACHE_KEY = "hrms_cache_employees";
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  const fetchFromSupabase = useCallback(async () => {
    setLoading(true);
    setError(null);

    // ─ Check TTL cache first ─────────────────────────────────────────────────
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data: cachedData, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL_MS && Array.isArray(cachedData) && cachedData.length > 0) {
          setStoredEmployees(cachedData);
          setLoading(false);
          return;
        }
      }
    } catch { /* ignore cache read errors */ }

    try {
      const { data, error: sbError } = await supabase
        .from("employees")
        .select("id, user_id, emp_code, full_name, official_email, mobile, department, designation, role, status, doj, dob, blood_group, location, salary, password")
        .order("id", { ascending: true })
        .limit(500);

      if (sbError) {
        setError(sbError.message);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setLoading(false);
        return;
      }

      const mapped: SyncedEmployee[] = data.map((row: any) => {
        const padId = String(row.id).padStart(3, "0");
        const name = row.full_name || row.name || "Unknown";
        return {
          id: `EMP-${padId}`,
          empCode: row.emp_code || `TISNX-${padId}`,
          name,
          email: row.official_email || row.email || "",
          phone: row.mobile || row.phone || "",
          avatar: getAvatar(name, "#6366f1", "#8b5cf6"),
          department: row.department || "General",
          designation: row.designation || "Employee",
          role: (row.role === "Admin" || row.role === "admin") ? "Admin" :
                (row.role === "Founder" || row.role === "founder") ? "Founder" :
                (row.role === "Cofounder" || row.role === "cofounder" || row.role === "co-founder" || row.role === "Co-founder") ? "Cofounder" :
                "Employee",
          status: row.status || "Active",
          joinDate: row.doj || row.joinDate || new Date().toISOString().split("T")[0],
          location: row.location || "",
          manager: row.manager || undefined,
          salary: row.salary || undefined,
          password: row.password || "Password123!",
          user_id: row.user_id || undefined,
        };
      });

      // ─ Write to TTL cache ─────────────────────────────────────────────────────
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: mapped, timestamp: Date.now() }));
      } catch { /* quota exceeded — skip caching */ }

      setStoredEmployees(mapped);
      setLoading(false);
    } catch (e: any) {
      setError(e.message || "Unknown error");
      setLoading(false);
    }
  }, [setStoredEmployees]);

  useEffect(() => {
    fetchFromSupabase();
  }, [fetchFromSupabase]);

  const [employees] = useStore<SyncedEmployee[]>("employees", []);
  return [employees, loading, error, fetchFromSupabase];
}
