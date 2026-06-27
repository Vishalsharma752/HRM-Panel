import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Sidebar, type Page } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { Menu, Loader2 } from "lucide-react";
import { initStorage, setCurrentUserSession } from "./data/store";
import { useAuth } from "./hooks/useAuth";

// ── Lazy-loaded pages — each becomes a separate JS chunk ───────────────────────
const Employees         = lazy(() => import("./pages/Employees").then(m => ({ default: m.Employees })));
const Attendance        = lazy(() => import("./pages/Attendance").then(m => ({ default: m.Attendance })));
const Leave             = lazy(() => import("./pages/Leave").then(m => ({ default: m.Leave })));
const Departments       = lazy(() => import("./pages/Departments").then(m => ({ default: m.Departments })));
const Tasks             = lazy(() => import("./pages/Tasks").then(m => ({ default: m.Tasks })));
const HR                = lazy(() => import("./pages/HR").then(m => ({ default: m.HR })));
const Reports           = lazy(() => import("./pages/Reports").then(m => ({ default: m.Reports })));
const NotificationsPage = lazy(() => import("./pages/Notifications").then(m => ({ default: m.NotificationsPage })));
const Settings          = lazy(() => import("./pages/Settings").then(m => ({ default: m.Settings })));
const Payroll           = lazy(() => import("./pages/Payroll").then(m => ({ default: m.Payroll })));
const Holidays          = lazy(() => import("./pages/Holidays").then(m => ({ default: m.Holidays })));
const AttendanceQueries = lazy(() => import("./pages/AttendanceQueries").then(m => ({ default: m.AttendanceQueries })));
const AdminUsers        = lazy(() => import("./pages/AdminUsers").then(m => ({ default: m.AdminUsers })));

// ── Page loading skeleton shown while lazy chunks download ────────────────────
function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded-xl bg-slate-200" />
          <div className="h-4 w-72 rounded-lg bg-slate-100" />
        </div>
        <div className="h-10 w-32 rounded-xl bg-slate-200" />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-100" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-slate-100" />
      <div className="h-96 rounded-2xl bg-slate-100" />
    </div>
  );
}

const titleMap: Record<Page, string> = {
  dashboard: "Dashboard",
  employees: "Employees",
  attendance: "Attendance",
  leave: "Leave Management",
  departments: "Departments",
  tasks: "Tasks",
  hr: "HR Management",
  reports: "Reports & Analytics",
  notifications: "Notifications",
  settings: "Settings",
  payroll: "Payroll Management",
  holidays: "Holiday Calendar",
  queries: "Attendance Queries",
  admin: "User Management",
};

export default function App() {
  // Initialize storage templates once
  useEffect(() => {
    initStorage();
  }, []);

  // ── Supabase Auth ──────────────────────────────────────────────────────────
  const { currentUser, authLoading, authError, signIn, signOut, clearAuthError, updateCurrentUser } = useAuth();

  const [page, setPage] = useState<Page>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState("");

  // Keep legacy sessionStorage in sync so other modules that read it still work
  useEffect(() => {
    setCurrentUserSession(currentUser);
  }, [currentUser]);

  // If user role restricts a page, redirect to dashboard
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === "Employee") {
        const adminPages: Page[] = ["employees", "departments", "hr", "reports", "admin"];
        if (adminPages.includes(page)) {
          setPage("dashboard");
        }
      } else if (currentUser.role === "Admin") {
        const founderPages: Page[] = ["admin"];
        if (founderPages.includes(page)) {
          setPage("dashboard");
        }
      }
    }
  }, [page, currentUser]);

  // Redirect to employees page when searching from a non-searchable page
  useEffect(() => {
    const searchablePages: Page[] = ["employees", "attendance", "leave", "tasks", "payroll"];
    if (search && !searchablePages.includes(page)) {
      setPage("employees");
    }
  }, [search, page]);

  // ── Memoized handlers — stable references prevent Sidebar/Topbar re-renders ──
  const handleLogout = useCallback(async () => {
    await signOut();
    setPage("dashboard");
  }, [signOut]);

  const handleNavigate = useCallback((p: Page) => {
    setPage(p);
    setSearch("");
    setMobileNav(false);
  }, []);

  const handleToggleCollapsed = useCallback(() => setCollapsed((c) => !c), []);
  const handleCloseMobileNav  = useCallback(() => setMobileNav(false), []);
  const handleOpenMobileNav   = useCallback(() => setMobileNav(true), []);
  const handleNavigateNotifications = useCallback(() => setPage("notifications"), []);
  const handleNavigateEmployees     = useCallback(() => setPage("employees"), []);
  const handleUpdateUser = useCallback((user: typeof currentUser) => {
    if (!user) return;
    setCurrentUserSession(user);
    updateCurrentUser(user);
  }, [updateCurrentUser]);

  // ── Auth Loading Screen ────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">TIS Nexus HRM</p>
            <p className="text-xs text-slate-400 mt-0.5">Checking authentication…</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Unauthenticated: Show Login ────────────────────────────────────────────
  if (!currentUser) {
    return (
      <Login
        onSignIn={signIn}
        authLoading={authLoading}
        authError={authError}
        clearAuthError={clearAuthError}
      />
    );
  }

  // ── Authenticated: Show App Shell ──────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <Sidebar
        page={page}
        onNavigate={handleNavigate}
        collapsed={collapsed}
        onToggle={handleToggleCollapsed}
        user={currentUser}
        onLogout={handleLogout}
      />

      {/* Mobile sidebar overlay */}
      {mobileNav && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={handleCloseMobileNav} />
          <div className="relative h-full w-72 bg-white shadow-2xl">
            <Sidebar
              page={page}
              onNavigate={handleNavigate}
              collapsed={false}
              onToggle={handleCloseMobileNav}
              user={currentUser}
              onLogout={handleLogout}
              mobile={true}
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 lg:hidden">
          <button
            onClick={handleOpenMobileNav}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="font-display text-sm font-extrabold text-slate-900">{titleMap[page]}</div>
        </div>

        {/* Desktop top bar */}
        <div className="sticky top-0 z-30 hidden lg:block">
          <Topbar
            title={titleMap[page]}
            onAdd={currentUser.role === "Admin" ? handleNavigateEmployees : undefined}
            user={currentUser}
            onLogout={handleLogout}
            search={search}
            onSearchChange={setSearch}
            onNavigateNotifications={handleNavigateNotifications}
          />
        </div>

        {/* Main content — lazy chunks load on first navigation */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<PageSkeleton />}>
            {page === "dashboard"     && <Dashboard onNavigate={setPage} currentUser={currentUser} />}
            {page === "employees"     && <Employees search={search} setSearch={setSearch} />}
            {page === "attendance"    && <Attendance currentUser={currentUser} search={search} setSearch={setSearch} />}
            {page === "leave"         && <Leave currentUser={currentUser} search={search} setSearch={setSearch} />}
            {page === "departments"   && <Departments />}
            {page === "tasks"         && <Tasks currentUser={currentUser} search={search} setSearch={setSearch} />}
            {page === "hr"            && <HR />}
            {page === "reports"       && <Reports />}
            {page === "notifications" && <NotificationsPage currentUser={currentUser} />}
            {page === "settings"      && (
              <Settings
                currentUser={currentUser}
                onUpdateUser={handleUpdateUser}
              />
            )}
            {page === "payroll"       && <Payroll currentUser={currentUser} search={search} setSearch={setSearch} />}
            {page === "holidays"      && <Holidays currentUser={currentUser} />}
            {page === "queries"       && <AttendanceQueries currentUser={currentUser} />}
            {page === "admin"         && <AdminUsers currentUser={currentUser} />}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
