import { useState, useEffect } from "react";
import { Sidebar, type Page } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { Dashboard } from "./pages/Dashboard";
import { Employees } from "./pages/Employees";
import { Attendance } from "./pages/Attendance";
import { Leave } from "./pages/Leave";
import { Departments } from "./pages/Departments";
import { Tasks } from "./pages/Tasks";
import { HR } from "./pages/HR";
import { Reports } from "./pages/Reports";
import { NotificationsPage } from "./pages/Notifications";
import { Settings } from "./pages/Settings";
import { Login } from "./pages/Login";
import { Payroll } from "./pages/Payroll";
import { Holidays } from "./pages/Holidays";
import { AttendanceQueries } from "./pages/AttendanceQueries";
import { AdminUsers } from "./pages/AdminUsers";
import { Menu, Loader2 } from "lucide-react";
import { initStorage, setCurrentUserSession } from "./data/store";
import { useAuth } from "./hooks/useAuth";

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

  const handleLogout = async () => {
    await signOut();
    setPage("dashboard");
  };

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
        onNavigate={(p) => { setPage(p); setSearch(""); setMobileNav(false); }}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        user={currentUser}
        onLogout={handleLogout}
      />

      {/* Mobile sidebar overlay */}
      {mobileNav && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileNav(false)} />
          <div className="relative h-full w-72 bg-white shadow-2xl">
            <Sidebar
              page={page}
              onNavigate={(p) => { setPage(p); setSearch(""); setMobileNav(false); }}
              collapsed={false}
              onToggle={() => setMobileNav(false)}
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
            onClick={() => setMobileNav(true)}
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
            onAdd={currentUser.role === "Admin" ? () => setPage("employees") : undefined}
            user={currentUser}
            onLogout={handleLogout}
            search={search}
            onSearchChange={setSearch}
            onNavigateNotifications={() => setPage("notifications")}
          />
        </div>

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {page === "dashboard" && <Dashboard onNavigate={setPage} currentUser={currentUser} />}
          {page === "employees" && <Employees search={search} setSearch={setSearch} />}
          {page === "attendance" && <Attendance currentUser={currentUser} search={search} setSearch={setSearch} />}
          {page === "leave" && <Leave currentUser={currentUser} search={search} setSearch={setSearch} />}
          {page === "departments" && <Departments />}
          {page === "tasks" && <Tasks currentUser={currentUser} search={search} setSearch={setSearch} />}
          {page === "hr" && <HR />}
          {page === "reports" && <Reports />}
          {page === "notifications" && <NotificationsPage currentUser={currentUser} />}
          {page === "settings" && (
            <Settings
              currentUser={currentUser}
              onUpdateUser={(user) => {
                setCurrentUserSession(user);
                updateCurrentUser(user);
              }}
            />
          )}
          {page === "payroll" && <Payroll currentUser={currentUser} search={search} setSearch={setSearch} />}
          {page === "holidays" && <Holidays currentUser={currentUser} />}
          {page === "queries" && <AttendanceQueries currentUser={currentUser} />}
          {page === "admin" && <AdminUsers currentUser={currentUser} />}
        </main>
      </div>
    </div>
  );
}
