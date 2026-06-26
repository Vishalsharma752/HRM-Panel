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
import { Menu } from "lucide-react";
import { initStorage, getCurrentUser, setCurrentUserSession, type SyncedEmployee } from "./data/store";

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
};

export default function App() {
  // Initialize storage templates once
  useEffect(() => {
    initStorage();
  }, []);

  const [currentUser, setCurrentUser] = useState<SyncedEmployee | null>(() => getCurrentUser());
  const [page, setPage] = useState<Page>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState("");

  // If user role restricts a page, redirect to dashboard
  useEffect(() => {
    if (currentUser && currentUser.role === "Employee") {
      const adminPages: Page[] = ["employees", "departments", "hr", "reports"];
      if (adminPages.includes(page)) {
        setPage("dashboard");
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

  // Synchronize currentUser status changes (e.g. deactivated by admin)
  useEffect(() => {
    if (!currentUser) return;
    const handleSync = () => {
      const storedEmps = localStorage.getItem("hrms_store_employees");
      if (storedEmps) {
        const emps: SyncedEmployee[] = JSON.parse(storedEmps);
        const matched = emps.find(e => e.id === currentUser.id);
        if (matched) {
          if (matched.status === "Inactive") {
            setCurrentUserSession(null);
            setCurrentUser(null);
            alert("Your account has been deactivated by the Administrator. Logging out.");
          } else if (JSON.stringify(matched) !== JSON.stringify(currentUser)) {
            setCurrentUserSession(matched);
            setCurrentUser(matched);
          }
        }
      }
    };
    window.addEventListener("storage", handleSync);
    window.addEventListener("storage-sync", handleSync);
    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("storage-sync", handleSync);
    };
  }, [currentUser]);

  const handleLogin = (user: SyncedEmployee) => {
    setCurrentUserSession(user);
    setCurrentUser(user);
    setPage("dashboard");
  };

  const handleLogout = () => {
    setCurrentUserSession(null);
    setCurrentUser(null);
  };

  if (!currentUser) return <Login onLogin={handleLogin} />;

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <Sidebar 
        page={page} 
        onNavigate={(p) => { setPage(p); setSearch(""); setMobileNav(false); }} 
        collapsed={collapsed} 
        onToggle={() => setCollapsed(c => !c)} 
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
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 lg:hidden">
          <button onClick={() => setMobileNav(true)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100">
            <Menu className="h-5 w-5" />
          </button>
          <div className="font-display text-sm font-extrabold text-slate-900">{titleMap[page]}</div>
        </div>

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
          {page === "settings" && <Settings currentUser={currentUser} onUpdateUser={(user) => { setCurrentUserSession(user); setCurrentUser(user); }} />}
          {page === "payroll" && <Payroll currentUser={currentUser} search={search} setSearch={setSearch} />}
          {page === "holidays" && <Holidays currentUser={currentUser} />}
          {page === "queries" && <AttendanceQueries currentUser={currentUser} />}
        </main>
      </div>
    </div>
  );
}
