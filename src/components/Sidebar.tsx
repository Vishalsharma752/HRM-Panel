import { useMemo, memo } from "react";
import {
  LayoutDashboard, Users, Clock, CalendarDays, Building2, ListTodo, UserCog, BarChart3,
  Bell, Settings, ChevronRight, LogOut, IndianRupee, Calendar, MessageCircle, X, ShieldAlert, Mail
} from "lucide-react";
import { BrandLogo, Avatar } from "./ui";
import { cn } from "../utils/cn";
import { type SyncedEmployee, useStore, isAdminRole } from "../data/store";

export type Page =
  | "dashboard"
  | "employees"
  | "attendance"
  | "leave"
  | "departments"
  | "tasks"
  | "hr"
  | "reports"
  | "notifications"
  | "settings"
  | "payroll"
  | "holidays"
  | "queries"
  | "admin"
  | "email-logs";

export const Sidebar = memo(function Sidebar({
  page,
  onNavigate,
  collapsed,
  onToggle,
  user,
  onLogout,
  mobile = false
}: {
  page: Page;
  onNavigate: (p: Page) => void;
  collapsed: boolean;
  onToggle: () => void;
  user: SyncedEmployee;
  onLogout: () => void;
  mobile?: boolean;
}) {
  const [notifications] = useStore<any[]>("notifications_v2", []);
  const [tasks] = useStore<any[]>("tasks", []);

  const unreadNotificationsCount = notifications.filter(n => !n.isRead && (n.role === "all" || n.role === user.role)).length;
  const incompleteTasksCount = tasks.filter(t => {
    if (t.status === "Completed") return false;
    if (user.role !== "Admin" && t.assignee !== user.name) return false;
    return true;
  }).length;

  const filteredGroups = useMemo(() => {
    const dynamicNavGroups = [
      {
        label: "Overview",
        items: [
          { id: "dashboard" as Page, label: "Dashboard", icon: LayoutDashboard },
          {
            id: "notifications" as Page,
            label: "Notifications",
            icon: Bell,
            badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined
          },
        ],
      },
      {
        label: "People",
        items: [
          { id: "employees" as Page, label: "Employees", icon: Users },
          { id: "departments" as Page, label: "Departments", icon: Building2 },
          { id: "hr" as Page, label: "HR Management", icon: UserCog },
        ],
      },
      {
        label: "Operations",
        items: [
          { id: "attendance" as Page, label: "Attendance", icon: Clock },
          { id: "leave" as Page, label: "Leave Management", icon: CalendarDays },
          { id: "holidays" as Page, label: "Holiday Calendar", icon: Calendar },
          {
            id: "tasks" as Page,
            label: "Tasks",
            icon: ListTodo,
            badge: incompleteTasksCount > 0 ? incompleteTasksCount : undefined
          },
          { id: "payroll" as Page, label: "Payroll", icon: IndianRupee },
          { id: "queries" as Page, label: "Attendance Queries", icon: MessageCircle },
        ],
      },
      {
        label: "Insights",
        items: [
          { id: "reports" as Page, label: "Reports & Analytics", icon: BarChart3 },
          { id: "settings" as Page, label: "Settings", icon: Settings },
        ],
      },
      {
        label: "Administration",
        items: [
          { id: "admin" as Page, label: "User Management", icon: ShieldAlert },
          { id: "email-logs" as Page, label: "Email Audit Logs", icon: Mail },
        ],
      },
    ];

    return dynamicNavGroups.map((group) => {
      const items = group.items.filter((item) => {
        // Hide Employee Management (employees) menu for Employee role
        if (item.id === "employees" && user.role === "Employee") return false;
        
        // Show Admin Panel (admin) and Email Logs (email-logs) menu only for Founder and Cofounder
        if (item.id === "admin" && !(user.role === "Founder" || user.role === "Cofounder")) return false;
        if (item.id === "email-logs" && !(user.role === "Founder" || user.role === "Cofounder")) return false;

        // Admin-only pages
        const adminOnlyPages: Page[] = ["employees", "departments", "hr", "admin", "email-logs"];
        if (adminOnlyPages.includes(item.id) && !isAdminRole(user.role)) return false;
        
        return true;
      });
      return { ...group, items };
    }).filter((group) => group.items.length > 0);
  }, [unreadNotificationsCount, incompleteTasksCount, user.role]);

  return (
    <aside
      className={cn(
        mobile
          ? "flex h-full w-full flex-col bg-gradient-to-b from-slate-900 to-slate-800 text-slate-100"
          : "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-slate-800/40 bg-gradient-to-b from-slate-900 to-slate-800 text-slate-100 transition-all duration-200 lg:flex",
        !mobile && (collapsed ? "w-[76px]" : "w-[260px]")
      )}
    >
      {/* Logo */}
      <div className={cn("flex h-16 items-center border-b border-slate-800/80 px-4", (collapsed && !mobile) ? "justify-center" : "justify-between")}>
        <BrandLogo compact={collapsed && !mobile} onDark={true} />
        <button
          onClick={onToggle}
          className={cn(
            "h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-all duration-200 cursor-pointer",
            mobile ? "flex" : "hidden lg:flex"
          )}
          aria-label={mobile ? "Close sidebar" : "Toggle sidebar"}
        >
          {mobile ? (
            <X className="h-4 w-4" />
          ) : (
            <ChevronRight className={cn("h-4 w-4 transition-transform", collapsed ? "" : "rotate-180")} />
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="scrollbar-thin flex-1 overflow-y-auto px-2.5 py-3">
        {filteredGroups.map((group) => (
          <div key={group.label} className="mb-4">
            {!collapsed && (
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{group.label}</div>
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map((it) => {
                const Icon = it.icon;
                const active = page === it.id;
                return (
                  <button
                    key={it.id}
                    onClick={() => onNavigate(it.id)}
                    className={cn(
                      "group relative flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-semibold transition-all duration-200 cursor-pointer",
                      active
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                        : "text-slate-400 hover:bg-white/5 hover:text-white",
                      collapsed && "justify-center px-0"
                    )}
                    title={collapsed ? it.label : undefined}
                  >
                    {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-white" />}
                    <Icon className={cn("h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-105", active ? "text-white" : "text-slate-400 group-hover:text-slate-200")} />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{it.label}</span>
                        {it.badge && (
                          <span className="rounded-md bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">{it.badge}</span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-slate-800/80 p-3">
        <div className={cn("flex items-center gap-2.5 rounded-xl p-2 hover:bg-white/5 transition-all duration-200", collapsed && "justify-center")}>
          <Avatar src={user.avatar} name={user.name} size={36} className="ring-2 ring-white/10" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-slate-100">{user.name}</div>
              <div className="truncate text-[11px] text-slate-400">{user.designation}</div>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={onLogout}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-all duration-200 cursor-pointer"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
});


// Role helper functions
export function isFounderRole(role: string): boolean {
  return role === "Founder" || role === "Cofounder";
}