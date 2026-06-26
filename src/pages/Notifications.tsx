import { useState, useMemo, useEffect, useCallback } from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import {
  Megaphone, CalendarDays, Clock, CheckCircle2,
  IndianRupee, Bell,
  Check, Trash2, Archive,
  RefreshCw, Inbox, Filter,
} from "lucide-react";
import { PageHeader, Card, CardHeader, Button, Badge, Toggle, EmptyState } from "../components/ui";
import { cn } from "../utils/cn";
import { type SyncedEmployee } from "../data/store";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Supabase Table Reference:
 * CREATE TABLE notifications (
 *   id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   company_id  TEXT NOT NULL,
 *   user_id     TEXT,          -- NULL = broadcast to all
 *   role        TEXT,          -- "Admin" | "Employee" | NULL for all
 *   title       TEXT NOT NULL,
 *   message     TEXT NOT NULL,
 *   type        TEXT NOT NULL, -- category key
 *   is_read     BOOLEAN DEFAULT false,
 *   created_at  TIMESTAMPTZ DEFAULT now()
 * );
 * RLS: users can only read their own OR broadcast (user_id IS NULL) notifications.
 */

export type NotifType =
  | "announcement"
  | "task"
  | "leave"
  | "attendance"
  | "payroll"
  | "system";

export interface HRMNotification {
  id: string;
  userId: string | null;   // null = broadcast to all of a role
  role: "Admin" | "Employee" | "all";
  title: string;
  message: string;
  type: NotifType;
  isRead: boolean;
  createdAt: string;       // ISO
  pinned?: boolean;
}

// ─── Type metadata ────────────────────────────────────────────────────────────
const TYPE_META: Record<NotifType, {
  label: string;
  icon: React.ElementType;
  gradient: string;
  bg: string;
  text: string;
  tabLabel: string;
}> = {
  announcement: {
    label: "Announcement", tabLabel: "Announcements",
    icon: Megaphone,
    gradient: "from-violet-500 to-fuchsia-600",
    bg: "bg-violet-50", text: "text-violet-700",
  },
  task: {
    label: "Task", tabLabel: "Tasks",
    icon: CheckCircle2,
    gradient: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50", text: "text-emerald-700",
  },
  leave: {
    label: "Leave", tabLabel: "Leave Requests",
    icon: CalendarDays,
    gradient: "from-amber-500 to-orange-600",
    bg: "bg-amber-50", text: "text-amber-700",
  },
  attendance: {
    label: "Attendance", tabLabel: "Attendance",
    icon: Clock,
    gradient: "from-sky-500 to-cyan-600",
    bg: "bg-sky-50", text: "text-sky-700",
  },
  payroll: {
    label: "Payroll", tabLabel: "Payroll",
    icon: IndianRupee,
    gradient: "from-rose-500 to-pink-600",
    bg: "bg-rose-50", text: "text-rose-700",
  },
  system: {
    label: "System", tabLabel: "System",
    icon: Bell,
    gradient: "from-slate-500 to-slate-600",
    bg: "bg-slate-50", text: "text-slate-700",
  },
};

// ─── Default seed notifications ───────────────────────────────────────────────
function buildDefaultNotifications(): HRMNotification[] {
  return [];
}

// ─── localStorage helpers ─────────────────────────────────────────────────────
const NOTIFS_KEY = "hrms_store_notifications_v2";

function readNotifications(): HRMNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeNotifications(list: HRMNotification[]): void {
  localStorage.setItem(NOTIFS_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("storage-sync"));
}

function initNotifications(): HRMNotification[] {
  const existing = readNotifications();
  if (existing.length > 0) return existing;
  const defaults = buildDefaultNotifications();
  writeNotifications(defaults);
  return defaults;
}

// ─── Tabs config ──────────────────────────────────────────────────────────────
type TabId = "all" | "unread" | NotifType;

const TABS: { id: TabId; label: string }[] = [
  { id: "all",          label: "All" },
  { id: "unread",       label: "Unread" },
  { id: "announcement", label: "Announcements" },
  { id: "task",         label: "Tasks" },
  { id: "leave",        label: "Leave Requests" },
  { id: "attendance",   label: "Attendance" },
  { id: "payroll",      label: "Payroll" },
];

// ─── Notification settings ────────────────────────────────────────────────────
interface NotifSettings {
  push: boolean;
  email: boolean;
  sms: boolean;
  slack: boolean;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function NotificationsPage({ currentUser }: { currentUser: SyncedEmployee }) {
  const isAdmin = currentUser.role === "Admin";

  // ── State ──────────────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<HRMNotification[]>(() => initNotifications());
  const [activeTab, setActiveTab]         = useState<TabId>("all");
  const [settings, setSettings]           = useState<NotifSettings>({ push: true, email: true, sms: false, slack: true });
  const [showSettings, setShowSettings]   = useState(false);
  const [loading, setLoading]             = useState(false);

  // ── Refresh from localStorage ──────────────────────────────────────────────
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

  // ── Filter by role ─────────────────────────────────────────────────────────
  const roleFiltered = useMemo(() =>
    notifications.filter((n) =>
      n.role === "all" || n.role === currentUser.role
    ),
    [notifications, currentUser.role]
  );

  // ── Tab filtering ──────────────────────────────────────────────────────────
  const tabFiltered = useMemo(() => {
    switch (activeTab) {
      case "all":    return roleFiltered;
      case "unread": return roleFiltered.filter((n) => !n.isRead);
      default:       return roleFiltered.filter((n) => n.type === activeTab);
    }
  }, [roleFiltered, activeTab]);

  // Sort: pinned first, then newest first
  const sorted = useMemo(() => {
    return [...tabFiltered].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [tabFiltered]);

  // ── Counts per tab ─────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const c: Record<TabId, number> = {
      all: 0, unread: 0,
      announcement: 0, task: 0, leave: 0, attendance: 0, payroll: 0, system: 0,
    };
    roleFiltered.forEach((n) => {
      c.all++;
      if (!n.isRead) c.unread++;
      c[n.type as NotifType]++;
    });
    return c;
  }, [roleFiltered]);

  // ── Mark single as read ────────────────────────────────────────────────────
  const markRead = (id: string) => {
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, isRead: true } : n
    );
    writeNotifications(updated);
    setNotifications(updated);
  };

  // ── Mark all as read ───────────────────────────────────────────────────────
  const markAllRead = () => {
    setLoading(true);
    const updated = notifications.map((n) =>
      (n.role === "all" || n.role === currentUser.role) ? { ...n, isRead: true } : n
    );
    setTimeout(() => {
      writeNotifications(updated);
      setNotifications(updated);
      setLoading(false);
    }, 400);
  };

  // ── Delete single ──────────────────────────────────────────────────────────
  const deleteNotif = (id: string) => {
    const updated = notifications.filter((n) => n.id !== id);
    writeNotifications(updated);
    setNotifications(updated);
  };

  // ── Featured (most recent unread pinned or first unread) ───────────────────
  const featured = useMemo(() =>
    roleFiltered.find((n) => n.pinned && !n.isRead) ||
    roleFiltered.find((n) => !n.isRead) ||
    roleFiltered[0],
    [roleFiltered]
  );

  // ── Tab items for rendering ─────────────────────────────────────────────────
  const tabItems = TABS.filter((t) => {
    // Show payroll and leave tabs contextually
    if (t.id === "system" && !isAdmin) return false;
    return true;
  });

  return (
    <div className="space-y-6">

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <PageHeader
        title="Notification Centre"
        subtitle={`${counts.unread} unread notification${counts.unread !== 1 ? "s" : ""} · ${counts.all} total`}
        breadcrumb={[{ label: "Home" }, { label: "Notifications" }]}
        actions={
          <>
            <Button
              variant="secondary"
              size="md"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={() => {
                setLoading(true);
                setTimeout(() => { refresh(); setLoading(false); }, 500);
              }}
            >
              Refresh
            </Button>
            {counts.unread > 0 && (
              <Button
                variant="primary"
                size="md"
                leftIcon={loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                onClick={markAllRead}
                disabled={loading}
              >
                {loading ? "Marking..." : "Mark All Read"}
              </Button>
            )}
          </>
        }
      />

      {/* ── Settings Strip ────────────────────────────────────────────────── */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          showSettings ? "max-h-40" : "max-h-0"
        )}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pb-2">
          {(
            [
              { key: "push",  label: "Push Notifications", desc: "Browser & mobile push" },
              { key: "email", label: "Email Digests",       desc: "Daily summary at 8 AM" },
              { key: "sms",   label: "SMS Alerts",          desc: "Critical updates only" },
              { key: "slack", label: "Slack Integration",   desc: "Forward to #hr-alerts" },
            ] as { key: keyof NotifSettings; label: string; desc: string }[]
          ).map((s) => (
            <div key={s.key} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
              <div>
                <div className="text-sm font-bold text-slate-900">{s.label}</div>
                <div className="text-[11px] text-slate-500">{s.desc}</div>
              </div>
              <Toggle
                checked={settings[s.key]}
                onChange={(v) => setSettings((prev) => ({ ...prev, [s.key]: v }))}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs + Actions row ────────────────────────────────────────────── */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Scrollable tab row */}
          <div className="flex-1 overflow-x-auto pb-1">
            <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 min-w-max">
              {tabItems.map((t) => {
                const isActive = activeTab === t.id;
                const count = counts[t.id];
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={cn(
                      "inline-flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-all whitespace-nowrap",
                      isActive
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {t.label}
                    {count > 0 && (
                      <span className={cn(
                        "rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                        isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                      )}>
                        {count}
                      </span>
                    )}
                    {t.id !== "all" && t.id !== "unread" && !isActive &&
                      roleFiltered.filter((n) => n.type === t.id && !n.isRead).length > 0 && (
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      )
                    }
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowSettings((v) => !v)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-all",
                showSettings
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              Preferences
            </button>
          </div>
        </div>
      </Card>

      {/* ── Featured Banner ───────────────────────────────────────────────── */}
      {featured && activeTab === "all" && (
        <Card className="overflow-hidden border border-indigo-200/80 bg-gradient-to-br from-indigo-50/10 to-violet-50/5 p-5 relative shadow-[0_4px_20px_-4px_rgba(99,102,241,0.08)]">
          <div className="absolute right-5 top-5 flex items-center gap-1.5">
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[9px] font-bold text-indigo-700 uppercase tracking-wider">
              Featured
            </span>
            {!featured.isRead && <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />}
          </div>

          <div className="flex gap-4">
            {(() => {
              const meta = TYPE_META[featured.type];
              const Icon = meta.icon;
              return (
                <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md", meta.gradient)}>
                  <Icon className="h-5.5 w-5.5" />
                </div>
              );
            })()}

            <div className="flex-1 min-w-0 pr-16">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", TYPE_META[featured.type].bg, TYPE_META[featured.type].text)}>
                  {TYPE_META[featured.type].label}
                </span>
                {!featured.isRead && <Badge variant="success" dot>New</Badge>}
              </div>
              <h2 className="mt-2 font-display text-base font-extrabold text-slate-900 leading-snug">{featured.title}</h2>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed line-clamp-2">{featured.message}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {!featured.isRead && (
                  <Button variant="primary" size="sm" onClick={() => markRead(featured.id)}>
                    Mark as Read
                  </Button>
                )}
                <Button variant="secondary" size="sm" leftIcon={<Archive className="h-3.5 w-3.5" />} onClick={() => deleteNotif(featured.id)}>
                  Dismiss
                </Button>
                <span className="ml-auto text-[11px] text-slate-400">
                  {formatDistanceToNow(parseISO(featured.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── Notification List ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title={
            <div className="flex items-center gap-2">
              {(() => {
                const t = tabItems.find((x) => x.id === activeTab);
                return <span>{t?.label ?? "All"} Notifications</span>;
              })()}
              {counts.unread > 0 && activeTab === "all" && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                  {counts.unread} unread
                </span>
              )}
            </div>
          }
          subtitle="Sorted by most recent · Pinned items first"
        />

        {sorted.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-7 w-7" />}
            title="No notifications available"
            description={
              activeTab === "unread"
                ? "You're all caught up! No unread notifications."
                : `No ${activeTab === "all" ? "" : (tabItems.find((t) => t.id === activeTab)?.label ?? activeTab) + " "}notifications yet.`
            }
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {sorted.map((notif) => {
              const meta = TYPE_META[notif.type] ?? TYPE_META.system;
              const Icon = meta.icon;
              return (
                <div
                  key={notif.id}
                  onClick={() => { if (!notif.isRead) markRead(notif.id); }}
                  className={cn(
                    "group relative flex items-start gap-4 px-5 py-4 transition-colors cursor-pointer select-none",
                    !notif.isRead
                      ? "bg-indigo-50/40 hover:bg-indigo-50/70"
                      : "hover:bg-slate-50/60"
                  )}
                >
                  {/* Unread left bar */}
                  {!notif.isRead && (
                    <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-indigo-500" />
                  )}

                  {/* Icon */}
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm", meta.gradient)}>
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <span className={cn(
                          "text-sm",
                          !notif.isRead ? "font-bold text-slate-900" : "font-semibold text-slate-700"
                        )}>
                          {notif.title}
                        </span>
                        {notif.pinned && (
                          <span className="ml-2 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 uppercase tracking-wider">
                            Pinned
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!notif.isRead && <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />}
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", meta.bg, meta.text)}>
                          {meta.label}
                        </span>
                      </div>
                    </div>

                    <p className="mt-0.5 text-[12px] text-slate-500 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>

                    <div className="mt-1.5 flex items-center gap-3">
                      <span className="text-[11px] font-medium text-slate-400">
                        {formatDistanceToNow(parseISO(notif.createdAt), { addSuffix: true })}
                      </span>
                      {!notif.isRead && (
                        <button
                          onClick={(e) => { e.stopPropagation(); markRead(notif.id); }}
                          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Hover actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {!notif.isRead && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markRead(notif.id); }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                        title="Mark read"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotif(notif.id); }}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load more / pagination hint */}
        {sorted.length >= 10 && (
          <div className="border-t border-slate-100 px-5 py-3 text-center">
            <span className="text-xs text-slate-400">
              Showing {sorted.length} notifications · Connect Supabase for realtime infinite scroll
            </span>
          </div>
        )}
      </Card>

      {/* ── Summary Footer ────────────────────────────────────────────────── */}
      {counts.all > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3">
          {(Object.entries({
            announcement: "Announcements",
            task: "Tasks",
            leave: "Leave",
            attendance: "Attendance",
            payroll: "Payroll",
          }) as [NotifType, string][]).map(([type, label]) => {
            const meta = TYPE_META[type];
            const c = counts[type];
            if (!c) return null;
            return (
              <button
                key={type}
                onClick={() => setActiveTab(type)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all",
                  activeTab === type ? "ring-2 ring-offset-1" : "",
                  meta.bg, meta.text
                )}
              >
                <meta.icon className="h-3 w-3" />
                {label}: {c}
              </button>
            );
          })}
          <span className="ml-auto text-[11px] text-slate-400">
            {counts.all} total · {counts.unread} unread
          </span>
        </div>
      )}
    </div>
  );
}
