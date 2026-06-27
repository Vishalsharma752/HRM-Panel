import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, Bell, MessageSquare, Plus, HelpCircle, LogOut,
  Megaphone, CalendarDays, Clock, CheckCircle2, IndianRupee,
  Check, X,
} from "lucide-react";
import { Avatar, Button } from "./ui";
import { cn } from "../utils/cn";
import { type SyncedEmployee } from "../data/store";

// ─── Mirror the same types used in Notifications.tsx ─────────────────────────
type NotifType = "announcement" | "task" | "leave" | "attendance" | "payroll" | "system";

interface HRMNotification {
  id: string;
  userId: string | null;
  role: "Admin" | "Employee" | "all";
  title: string;
  message: string;
  type: NotifType;
  isRead: boolean;
  createdAt: string;
  pinned?: boolean;
}

const NOTIFS_KEY = "hrms_store_notifications_v2";

function readNotifications(): HRMNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function writeNotifications(list: HRMNotification[]): void {
  localStorage.setItem(NOTIFS_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("storage-sync"));
}

// ─── Icon + color per type ────────────────────────────────────────────────────
const TYPE_META: Record<NotifType, { icon: React.ElementType; bg: string; text: string }> = {
  announcement: { icon: Megaphone,     bg: "bg-violet-100", text: "text-violet-700" },
  task:         { icon: CheckCircle2,  bg: "bg-emerald-100",text: "text-emerald-700"},
  leave:        { icon: CalendarDays,  bg: "bg-amber-100",  text: "text-amber-700"  },
  attendance:   { icon: Clock,         bg: "bg-sky-100",    text: "text-sky-700"    },
  payroll:      { icon: IndianRupee,   bg: "bg-rose-100",   text: "text-rose-700"   },
  system:       { icon: Bell,          bg: "bg-slate-100",  text: "text-slate-600"  },
};

function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)   return "just now";
    if (mins < 60)  return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  } catch { return ""; }
}

// ─── Component ────────────────────────────────────────────────────────────────
export function Topbar({
  title,
  onAdd,
  user,
  onLogout,
  search = "",
  onSearchChange,
  onNavigateNotifications,
}: {
  title: string;
  onAdd?: () => void;
  user: SyncedEmployee;
  onLogout: () => void;
  search?: string;
  onSearchChange?: (val: string) => void;
  onNavigateNotifications?: () => void;
}) {
  const [openNotif, setOpenNotif] = useState(false);
  const [notifications, setNotifications] = useState<HRMNotification[]>(readNotifications);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // ── Sync from localStorage ─────────────────────────────────────────────────
  const refresh = useCallback(() => {
    setNotifications(readNotifications());
  }, []);

  useEffect(() => {
    window.addEventListener("storage-sync", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("storage-sync", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  // ── Close panel on outside click ───────────────────────────────────────────
  useEffect(() => {
    if (!openNotif) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpenNotif(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openNotif]);

  // ── Derived data ───────────────────────────────────────────────────────────
  const roleFiltered = notifications.filter(
    (n) => n.role === "all" || n.role === user.role
  );

  const unreadCount = roleFiltered.filter((n) => !n.isRead).length;

  // Show 6 most recent in dropdown
  const preview = [...roleFiltered]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  // ── Mark single as read ────────────────────────────────────────────────────
  const markRead = (id: string) => {
    const updated = notifications.map((n) => n.id === id ? { ...n, isRead: true } : n);
    writeNotifications(updated);
    setNotifications(updated);
  };

  // ── Mark all as read ───────────────────────────────────────────────────────
  const markAllRead = () => {
    const updated = notifications.map((n) =>
      (n.role === "all" || n.role === user.role) ? { ...n, isRead: true } : n
    );
    writeNotifications(updated);
    setNotifications(updated);
  };

  // ── Local search with debounce ─────────────────────────────────────────────
  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => { setLocalSearch(search); }, [search]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (localSearch !== search) onSearchChange?.(localSearch);
    }, 300);
    return () => clearTimeout(t);
  }, [localSearch, onSearchChange, search]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">

        {/* Page title (mobile) */}
        <div className="lg:hidden">
          <div className="font-display text-sm font-extrabold text-slate-900">{title}</div>
        </div>

        {/* Search */}
        <div className="ml-auto hidden flex-1 lg:block lg:max-w-md">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search employees, tasks, departments…"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-16 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:outline-none"
            />
            <span className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-500 sm:inline">⌘K</span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          {onAdd && (
            <Button variant="gradient" size="md" leftIcon={<Plus className="h-4 w-4" />} onClick={onAdd} className="hidden sm:inline-flex">
              Add Employee
            </Button>
          )}

          <button className="hidden h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 sm:flex" aria-label="Help">
            <HelpCircle className="h-[18px] w-[18px]" />
          </button>
          <button className="hidden h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 sm:flex" aria-label="Messages">
            <MessageSquare className="h-[18px] w-[18px]" />
          </button>

          {/* ── Notification Bell + Dropdown ─────────────────────────────── */}
          <div className="relative" ref={panelRef}>
            <button
              onClick={() => setOpenNotif((o) => !o)}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              aria-label="Notifications"
            >
              <Bell className={cn("h-[18px] w-[18px] transition-transform", openNotif && "scale-110 text-indigo-600")} />
              {unreadCount > 0 && (
                <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {openNotif && (
              <div className="absolute right-0 top-12 z-40 w-[380px] origin-top-right overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md shadow-slate-900/10 animate-in fade-in slide-in-from-top-2 duration-150 transition-all">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div>
                    <div className="font-display text-sm font-bold text-slate-900">Notifications</div>
                    <div className="text-[11px] text-slate-500">
                      {unreadCount > 0
                        ? `${unreadCount} unread update${unreadCount !== 1 ? "s" : ""}`
                        : "All caught up!"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
                      >
                        <Check className="h-3 w-3" />
                        Mark all read
                      </button>
                    )}
                    <button
                      onClick={() => setOpenNotif(false)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* List */}
                <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-50">
                  {preview.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                        <Bell className="h-5 w-5 text-slate-400" />
                      </div>
                      <div className="text-sm font-semibold text-slate-700">No notifications available</div>
                      <div className="mt-1 text-[11px] text-slate-400">You'll see updates from HR, tasks, and more here</div>
                    </div>
                  ) : (
                    preview.map((n) => {
                      const meta = TYPE_META[n.type] ?? TYPE_META.system;
                      const Icon = meta.icon;
                      return (
                        <div
                          key={n.id}
                          onClick={() => markRead(n.id)}
                          className={cn(
                            "group flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors",
                            !n.isRead ? "bg-indigo-50/50 hover:bg-indigo-50" : "hover:bg-slate-50"
                          )}
                        >
                          {/* Unread bar */}
                          {!n.isRead && (
                            <div className="absolute left-0 h-8 w-0.5 rounded-r bg-indigo-500 mt-3 ml-0" />
                          )}

                          {/* Icon */}
                          <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", meta.bg, meta.text)}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <div className={cn(
                              "text-[13px] leading-snug line-clamp-2",
                              !n.isRead ? "font-semibold text-slate-900" : "font-medium text-slate-700"
                            )}>
                              {n.title}
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-400">{timeAgo(n.createdAt)}</div>
                          </div>

                          {/* Unread dot */}
                          {!n.isRead && (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 px-4 py-2.5 text-center">
                  <button
                    onClick={() => {
                      setOpenNotif(false);
                      onNavigateNotifications?.();
                    }}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    View all notifications →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User chip */}
          <div className="ml-1 hidden h-10 items-center gap-2.5 rounded-xl border border-slate-200 bg-white pr-2 pl-1.5 hover:border-slate-300 sm:flex">
            <Avatar src={user.avatar} name={user.name} size={30} />
            <div className="hidden text-left lg:block">
              <div className="text-xs font-bold leading-tight text-slate-900">{user.name}</div>
              <div className="text-[10px] font-medium text-slate-500">{user.designation}</div>
            </div>
            <button
              onClick={onLogout}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Logout"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
