import { useState, useEffect, useCallback } from "react";

/**
 * ─── Supabase Table Schema ────────────────────────────────────────────────────
 *
 * CREATE TABLE attendance_queries (
 *   id              TEXT PRIMARY KEY,
 *   employee_id     TEXT NOT NULL,
 *   employee_name   TEXT NOT NULL,
 *   department      TEXT NOT NULL,
 *   avatar          TEXT,
 *   date            DATE NOT NULL,          -- disputed attendance date YYYY-MM-DD
 *   query_type      TEXT NOT NULL,
 *   subject         TEXT NOT NULL,
 *   description     TEXT NOT NULL,
 *   status          TEXT NOT NULL DEFAULT 'Pending',
 *   attendance_snapshot JSONB,              -- {checkIn, checkOut, status}
 *   hr_response     TEXT,
 *   responded_by    TEXT,
 *   responded_at    TIMESTAMPTZ,
 *   created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
 *   updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
 * );
 *
 * -- RLS Policies
 * ALTER TABLE attendance_queries ENABLE ROW LEVEL SECURITY;
 *
 * CREATE POLICY "employee_own_queries" ON attendance_queries
 *   FOR SELECT USING (auth.uid()::text = employee_id);
 *
 * CREATE POLICY "admin_all_queries" ON attendance_queries
 *   FOR ALL USING (get_user_role(auth.uid()) IN ('Admin', 'HR'));
 *
 * ─── Supabase Migration ───────────────────────────────────────────────────────
 * Replace the helper functions below with Supabase client calls:
 *   createQuery()  → supabase.from('attendance_queries').insert(...)
 *   updateQuery()  → supabase.from('attendance_queries').update(...).eq('id', id)
 *   useQueryStore()→ subscribe to realtime channel for live updates
 * ─────────────────────────────────────────────────────────────────────────────
 */

const QUERIES_KEY = "hrms_store_attendance_queries";

export type QueryStatus = "Pending" | "In Review" | "Resolved" | "Rejected";
export type QueryType =
  | "Missed Punch-In"
  | "Missed Punch-Out"
  | "Wrong Status"
  | "Early Departure"
  | "Half Day"
  | "Other";

export interface AttendanceQuery {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  avatar?: string;
  /** YYYY-MM-DD — the disputed attendance date */
  date: string;
  queryType: QueryType;
  subject: string;
  description: string;
  status: QueryStatus;
  createdAt: string;
  updatedAt: string;
  /** Snapshot of attendance record at the time the query was raised */
  attendanceSnapshot?: {
    checkIn: string;
    checkOut: string;
    status: string;
  };
  hrResponse?: string;
  respondedBy?: string;
  respondedAt?: string;
}

// ─── Storage initializer ──────────────────────────────────────────────────────
export function initQueryStorage(): void {
  if (!localStorage.getItem(QUERIES_KEY)) {
    localStorage.setItem(QUERIES_KEY, JSON.stringify([]));
  }
}

// ─── Internal read/write ──────────────────────────────────────────────────────
function readQueries(): AttendanceQuery[] {
  try {
    const raw = localStorage.getItem(QUERIES_KEY);
    return raw ? (JSON.parse(raw) as AttendanceQuery[]) : [];
  } catch {
    return [];
  }
}

function writeQueries(queries: AttendanceQuery[]): void {
  localStorage.setItem(QUERIES_KEY, JSON.stringify(queries));
  window.dispatchEvent(new Event("storage-sync"));
}

// ─── Mutations ────────────────────────────────────────────────────────────────
export function createQuery(
  payload: Omit<AttendanceQuery, "id" | "status" | "createdAt" | "updatedAt">
): AttendanceQuery {
  const now = new Date().toISOString();
  const query: AttendanceQuery = {
    ...payload,
    id: `QRY-${Date.now()}`,
    status: "Pending",
    createdAt: now,
    updatedAt: now,
  };
  writeQueries([query, ...readQueries()]);
  return query;
}

export function updateQuery(
  id: string,
  status: QueryStatus,
  hrResponse: string,
  respondedBy: string
): void {
  const now = new Date().toISOString();
  writeQueries(
    readQueries().map((q) =>
      q.id === id
        ? {
            ...q,
            status,
            hrResponse,
            respondedBy,
            respondedAt: now,
            updatedAt: now,
          }
        : q
    )
  );
}

// ─── React hook ───────────────────────────────────────────────────────────────
export function useQueryStore(): {
  queries: AttendanceQuery[];
  refresh: () => void;
} {
  const [queries, setQueries] = useState<AttendanceQuery[]>(readQueries);

  const refresh = useCallback(() => {
    setQueries(readQueries());
  }, []);

  useEffect(() => {
    window.addEventListener("storage-sync", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("storage-sync", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  return { queries, refresh };
}
