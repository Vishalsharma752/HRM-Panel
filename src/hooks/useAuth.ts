/**
 * useAuth — Supabase Authentication Hook
 *
 * Priority order:
 *  1. supabase.auth.signInWithPassword() — PRIMARY auth gate.
 *     If this succeeds, the user is authenticated. Period.
 *     We then try to enrich their profile from the employees table.
 *     If no row is found, we still let them in using Auth user metadata.
 *
 *  2. Employees table — PROFILE ENRICHMENT ONLY (not auth gate).
 *     Used to get role, department, designation, etc.
 *     Failing to find a row does NOT block login.
 *
 *  3. Fallback path — for employees who don't have Supabase Auth accounts.
 *     Checks the employees table password field directly.
 *     Session stored in localStorage under FALLBACK_KEY.
 *
 *  4. onAuthStateChange — handles cross-tab sync, token refresh, sign-out.
 *     Skips INITIAL_SESSION event to avoid race with init().
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../components/supabase";
import type { User } from "@supabase/supabase-js";
import type { SyncedEmployee } from "../data/store";

// ─────────────────────────────── HELPERS ──────────────────────────────────

function buildAvatar(name: string): string {
  const safe = (name || "U").trim();
  const initials =
    safe.split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="#6366f1"/>` +
    `<stop offset="100%" stop-color="#8b5cf6"/>` +
    `</linearGradient></defs>` +
    `<rect width="80" height="80" rx="40" fill="url(#g)"/>` +
    `<text x="50%" y="54%" text-anchor="middle" font-family="Inter,sans-serif" ` +
    `font-size="28" font-weight="700" fill="white" dominant-baseline="middle">${initials}</text>` +
    `</svg>`
  )}`;
}

function mapRoleFromDB(raw: string | undefined): "Admin" | "Employee" | "Founder" | "Cofounder" {
  const r = (raw || "").toLowerCase().trim();
  if (r === "founder") return "Founder";
  if (r === "cofounder" || r === "co-founder") return "Cofounder";
  if (r === "admin") return "Admin";
  return "Employee";
}

function mapRowToEmployee(row: any): SyncedEmployee {
  const padId = String(row.id).padStart(3, "0");
  const name = (row.full_name || row.name || "Unknown").trim();
  const role = mapRoleFromDB(row.role);
  return {
    id: `EMP-${padId}`,
    empCode: row.emp_code || `TISNX-${padId}`,
    name,
    email: (row.official_email || row.email || "").trim(),
    phone: row.mobile || row.phone || "",
    avatar: buildAvatar(name),
    department: row.department || "General",
    designation: row.designation || "Employee",
    role,
    status: (row.status || "Active") as "Active" | "On Leave" | "Inactive" | "Probation",
    joinDate: row.doj || row.joinDate || new Date().toISOString().split("T")[0],
    location: row.location || "",
    manager: row.manager || undefined,
    salary: row.salary || undefined,
    password: row.password || "Password123!",
    user_id: row.user_id || undefined,
  };
}

/**
 * Build a minimal SyncedEmployee from a Supabase Auth User object.
 * Used when the user has a Supabase Auth account but NO row in the employees table.
 */
function authUserToEmployee(user: User): SyncedEmployee {
  const email = user.email || "";
  const meta = user.user_metadata || {};
  const name = meta.full_name || meta.name || email.split("@")[0] || "User";
  const role = mapRoleFromDB(meta.role);
  return {
    id: `AUTH-${user.id.slice(0, 8)}`,
    empCode: `AUTH-${user.id.slice(0, 6).toUpperCase()}`,
    name,
    email,
    phone: meta.phone || "—",
    avatar: buildAvatar(name),
    department: meta.department || "General",
    designation: meta.designation || (
      role === "Founder" ? "Founder" :
      role === "Cofounder" ? "Co-founder" :
      "Employee"
    ),
    role,
    status: "Active",
    joinDate: user.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
    location: meta.location || "India",
    password: undefined,
  };
}

/**
 * Try to fetch an employee profile from the employees table.
 * Returns null without throwing — failure is non-fatal.
 */
async function fetchEmployeeProfile(email: string): Promise<SyncedEmployee | null> {
  const normalized = email.trim().toLowerCase();
  console.log("[useAuth] fetchEmployeeProfile →", normalized);
  try {
    // Try official_email column
    const res1 = await supabase
      .from("employees")
      .select("*")
      .ilike("official_email", normalized)
      .limit(1)
      .maybeSingle();

    if (res1.data) {
      const emp = mapRowToEmployee(res1.data);
      console.log("[useAuth] found employee (official_email):", emp.name, emp.role, emp.status);
      return emp;
    }
    if (res1.error) console.warn("[useAuth] official_email lookup:", res1.error.message);

    // No email column lookup fallback necessary since 'official_email' is the column name in this table.

    console.log("[useAuth] no employee row found for:", normalized, "(non-fatal)");
    return null;
  } catch (e: any) {
    console.warn("[useAuth] fetchEmployeeProfile exception (non-fatal):", e.message);
    return null;
  }
}

// ─────────────────────────── FALLBACK SESSION ─────────────────────────────

const FALLBACK_KEY = "hrms_auth_fallback_user";

function saveFallback(emp: SyncedEmployee) {
  try {
    const json = JSON.stringify(emp);
    sessionStorage.setItem(FALLBACK_KEY, json);
    localStorage.setItem(FALLBACK_KEY, json);
  } catch {}
}

function loadFallback(): SyncedEmployee | null {
  try {
    const raw = sessionStorage.getItem(FALLBACK_KEY) || localStorage.getItem(FALLBACK_KEY);
    return raw ? (JSON.parse(raw) as SyncedEmployee) : null;
  } catch { return null; }
}

function clearFallback() {
  sessionStorage.removeItem(FALLBACK_KEY);
  localStorage.removeItem(FALLBACK_KEY);
  sessionStorage.removeItem("hrms_current_user");
}

// ─────────────────────────────── HOOK ─────────────────────────────────────

export interface AuthState {
  currentUser: SyncedEmployee | null;
  authLoading: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
  updateCurrentUser: (user: SyncedEmployee) => void;
}

export function useAuth(): AuthState {
  const [currentUser, setCurrentUser] = useState<SyncedEmployee | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const initDone = useRef(false);

  // ── On mount: restore existing session ────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      console.log("[useAuth] init: checking Supabase session...");
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) console.error("[useAuth] getSession error:", error.message);

        console.log("[useAuth] session →", {
          email: session?.user?.email ?? null,
          expires: session?.expires_at ?? null,
        });

        if (session?.user) {
          // ── Supabase Auth session exists ─────────────────────────────
          const profile = await fetchEmployeeProfile(session.user.email!);
          if (cancelled) return;

          if (profile && profile.status === "Inactive") {
            console.warn("[useAuth] User inactive — signing out");
            await supabase.auth.signOut();
            clearFallback();
            setCurrentUser(null);
          } else {
            // Use employee profile if found, else build from Auth user
            const user = profile ?? authUserToEmployee(session.user);
            console.log("[useAuth] session restored:", user.name, user.role);
            setCurrentUser(user);
            saveFallback(user);
          }
          return;
        }

        // ── No Supabase session → check fallback (employees table users) ──
        const fallback = loadFallback();
        if (fallback) {
          console.log("[useAuth] fallback session found:", fallback.name, fallback.email);
          if (!cancelled) {
            // Re-validate from live DB (non-fatal if DB fails)
            const live = await fetchEmployeeProfile(fallback.email);
            if (live && live.status !== "Inactive") {
              setCurrentUser(live);
              saveFallback(live);
            } else if (!live) {
              // DB lookup failed (network?) — trust cached fallback
              console.warn("[useAuth] could not re-validate fallback, trusting cache");
              setCurrentUser(fallback);
            } else {
              console.warn("[useAuth] fallback user is inactive — clearing");
              clearFallback();
              setCurrentUser(null);
            }
          }
          return;
        }

        if (!cancelled) {
          console.log("[useAuth] no session — showing login");
          setCurrentUser(null);
        }
      } catch (e: any) {
        console.error("[useAuth] init exception:", e.message);
        if (!cancelled) setCurrentUser(null);
      } finally {
        if (!cancelled) {
          initDone.current = true;
          setAuthLoading(false);
        }
      }
    };

    init();

    // Listen for post-init Supabase auth events (cross-tab, token refresh, signout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!initDone.current) return; // init() handles the initial state
      console.log("[useAuth] onAuthStateChange:", event, session?.user?.email ?? "null");

      if (event === "SIGNED_OUT") {
        clearFallback();
        if (!cancelled) setCurrentUser(null);
        return;
      }

      if (
        (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") &&
        session?.user
      ) {
        const profile = await fetchEmployeeProfile(session.user.email!);
        const user = profile && profile.status !== "Inactive"
          ? profile
          : !profile
          ? authUserToEmployee(session.user)
          : null;
        if (user && !cancelled) {
          setCurrentUser(user);
          saveFallback(user);
        }
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // ── signIn ─────────────────────────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    setAuthLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    console.log("[useAuth] signIn attempt →", normalizedEmail);

    try {
      // ── Path A: Supabase Auth ──────────────────────────────────────────
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      console.log("DEBUG: email", normalizedEmail);
      console.log("DEBUG: auth response", data);
      console.log("DEBUG: auth error", signInError);
      console.log("DEBUG: session", data?.session);

      console.log("[useAuth] signInWithPassword →", {
        error: signInError?.message ?? null,
        userId: data?.user?.id ?? null,
        email: data?.user?.email ?? null,
        sessionExpires: data?.session?.expires_at ?? null,
      });

      if (!signInError && data?.user && data?.session) {
        // ✅ Supabase Auth succeeded — get profile (non-blocking)
        const profile = await fetchEmployeeProfile(data.user.email!);

        if (profile?.status === "Inactive") {
          setAuthError("This account has been deactivated. Contact Administrator.");
          await supabase.auth.signOut();
          return;
        }

        // Link employees.user_id to Supabase Auth UUID dynamically
        if (profile) {
          try {
            await supabase
              .from("employees")
              .update({ user_id: data.user.id })
              .eq("official_email", normalizedEmail);
            profile.user_id = data.user.id;
          } catch (updateErr) {
            console.warn("[useAuth] Failed to link employee user_id:", updateErr);
          }
        }

        // Use employee profile if available, otherwise use Auth user metadata
        const user = profile ?? authUserToEmployee(data.user);
        console.log("[useAuth] ✅ Login success (Supabase Auth):", user.name, user.role);
        setCurrentUser(user);
        saveFallback(user);
        return;
      }

      // ── Path B: Employees table fallback ─────────────────────────────
      // Handles employees without Supabase Auth accounts
      console.log("[useAuth] Supabase Auth failed:", signInError?.message, "→ checking employees table");
      const emp = await fetchEmployeeProfile(normalizedEmail);

      if (!emp) {
        // Give a clear error — either wrong email or not in employees table
        const msg = signInError?.message?.includes("Invalid login credentials")
          ? "Invalid email or password. Please check your credentials."
          : signInError?.message ?? "Authentication failed. Please try again.";
        console.error("[useAuth] ❌ Login failed:", msg);
        setAuthError(msg);
        return;
      }

      if (emp.status === "Inactive") {
        setAuthError("This account has been deactivated. Contact Administrator.");
        return;
      }

      const storedPwd = emp.password || "Password123!";
      if (password !== storedPwd) {
        setAuthError("Invalid email or password. Please try again.");
        return;
      }

      // ✅ Employees table auth succeeded
      console.log("[useAuth] ✅ Login success (employees table fallback):", emp.name, emp.role);
      setCurrentUser(emp);
      saveFallback(emp);
    } catch (e: any) {
      console.error("[useAuth] signIn exception:", e.message);
      setAuthError("An unexpected error occurred. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  }, []);

  // ── signOut ────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    console.log("[useAuth] signOut");
    setAuthLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (e: any) {
      console.error("[useAuth] signOut error:", e.message);
    } finally {
      clearFallback();
      setCurrentUser(null);
      setAuthLoading(false);
    }
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);
  const updateCurrentUser = useCallback((user: SyncedEmployee) => {
    setCurrentUser(user);
    saveFallback(user);
  }, []);

  return { currentUser, authLoading, authError, signIn, signOut, clearAuthError, updateCurrentUser };
}
