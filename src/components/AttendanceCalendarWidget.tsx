import { useState, useEffect, useMemo, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Plane,
  Timer,
  MapPin,
  CalendarDays,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { cn } from "../utils/cn";
import type { SyncedEmployee, AttendanceRecord } from "../data/store";
import { fetchMonthAttendance } from "../services/attendanceService";
import { RaiseQueryModal, type QueryRaiseData } from "./AttendanceQueryModal";

// ─── Types ───────────────────────────────────────────────────────────────────
type DayStatus =
  | "present"
  | "late"
  | "leave"
  | "absent"
  | "future"
  | "weekend"
  | "today-empty";

interface DayCell {
  date: Date;
  dateStr: string;
  dayNum: number;
  dayOfWeek: number; // 0 = Sun, 6 = Sat
  status: DayStatus;
  record?: AttendanceRecord;
  isToday: boolean;
}

// ─── Status visual config ────────────────────────────────────────────────────
const STATUS_CFG: Record<
  DayStatus,
  {
    cell: string;
    numColor: string;
    dot: string;
    badgeBg: string;
    badgeText: string;
    label: string;
  }
> = {
  present: {
    cell: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300",
    numColor: "text-emerald-800",
    dot: "bg-emerald-500",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-800",
    label: "Present",
  },
  late: {
    cell: "bg-sky-50 border-sky-200 hover:bg-sky-100 hover:border-sky-300",
    numColor: "text-sky-800",
    dot: "bg-sky-500",
    badgeBg: "bg-sky-100",
    badgeText: "text-sky-800",
    label: "Late",
  },
  leave: {
    cell: "bg-amber-50 border-amber-200 hover:bg-amber-100 hover:border-amber-300",
    numColor: "text-amber-800",
    dot: "bg-amber-500",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-800",
    label: "On Leave",
  },
  absent: {
    cell: "bg-rose-50 border-rose-200 hover:bg-rose-100 hover:border-rose-300",
    numColor: "text-rose-800",
    dot: "bg-rose-500",
    badgeBg: "bg-rose-100",
    badgeText: "text-rose-800",
    label: "Absent",
  },
  future: {
    cell: "bg-slate-50 border-slate-100 cursor-default opacity-50",
    numColor: "text-slate-300",
    dot: "bg-slate-200",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-400",
    label: "Future",
  },
  weekend: {
    cell: "bg-slate-50 border-slate-100 hover:bg-slate-100",
    numColor: "text-slate-400",
    dot: "bg-slate-200",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-500",
    label: "Weekend",
  },
  "today-empty": {
    cell: "bg-indigo-50 border-indigo-300 hover:bg-indigo-100",
    numColor: "text-indigo-700",
    dot: "bg-indigo-400",
    badgeBg: "bg-indigo-100",
    badgeText: "text-indigo-800",
    label: "Today",
  },
};

const SUMMARY_STATS = [
  {
    key: "present" as DayStatus,
    label: "Present",
    icon: CheckCircle2,
    gradient: "from-emerald-500 to-teal-500",
    bg: "bg-emerald-50",
    numColor: "text-emerald-700",
  },
  {
    key: "absent" as DayStatus,
    label: "Absent",
    icon: XCircle,
    gradient: "from-rose-500 to-pink-600",
    bg: "bg-rose-50",
    numColor: "text-rose-700",
  },
  {
    key: "late" as DayStatus,
    label: "Late",
    icon: Timer,
    gradient: "from-sky-500 to-blue-500",
    bg: "bg-sky-50",
    numColor: "text-sky-700",
  },
  {
    key: "leave" as DayStatus,
    label: "On Leave",
    icon: Plane,
    gradient: "from-amber-500 to-orange-500",
    bg: "bg-amber-50",
    numColor: "text-amber-700",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatWorkHours(inISO?: string, outISO?: string): string {
  if (!inISO || !outISO) return inISO ? "Active" : "—";
  const diff = new Date(outISO).getTime() - new Date(inISO).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function resolveDayStatus(
  dateStr: string,
  todayStr: string,
  dayOfWeek: number,
  record?: AttendanceRecord
): DayStatus {
  if (dateStr > todayStr) return "future";
  if (record) {
    if (record.status === "Late") return "late";
    if (record.status === "On Leave") return "leave";
    if (record.status === "Absent") return "absent";
    return "present";
  }
  if (dateStr === todayStr) return "today-empty";
  if (dayOfWeek === 0 || dayOfWeek === 6) return "weekend";
  return "absent";
}

// ─── Day Detail Modal ─────────────────────────────────────────────────────────
function DayDetailModal({
  day,
  onClose,
  isEmployee,
  onRaiseQuery,
}: {
  day: DayCell;
  onClose: () => void;
  isEmployee?: boolean;
  onRaiseQuery?: () => void;
}) {
  const cfg = STATUS_CFG[day.status];
  const { record } = day;

  const iconMap: Record<DayStatus, React.ElementType> = {
    present: CheckCircle2,
    late: Timer,
    leave: Plane,
    absent: XCircle,
    future: CalendarDays,
    weekend: CalendarDays,
    "today-empty": Clock,
  };
  const Icon = iconMap[day.status];

  const bannerBg: Record<DayStatus, string> = {
    present: "bg-emerald-50",
    late: "bg-sky-50",
    leave: "bg-amber-50",
    absent: "bg-rose-50",
    future: "bg-slate-50",
    weekend: "bg-slate-50",
    "today-empty": "bg-indigo-50",
  };
  const iconBg: Record<DayStatus, string> = {
    present: "bg-emerald-100",
    late: "bg-sky-100",
    leave: "bg-amber-100",
    absent: "bg-rose-100",
    future: "bg-slate-100",
    weekend: "bg-slate-100",
    "today-empty": "bg-indigo-100",
  };
  const iconColor: Record<DayStatus, string> = {
    present: "text-emerald-600",
    late: "text-sky-600",
    leave: "text-amber-600",
    absent: "text-rose-600",
    future: "text-slate-400",
    weekend: "text-slate-400",
    "today-empty": "text-indigo-600",
  };

  const emptyMsg: Record<DayStatus, string> = {
    absent: "No check-in recorded for this workday.",
    weekend: "Weekend — office is closed.",
    future: "This date is in the future.",
    "today-empty": "You haven't checked in yet today.",
    present: "",
    late: "",
    leave: "",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <CalendarDays className="h-4 w-4 text-[#025085]" />
            <span className="font-bold text-slate-900 text-sm">
              {format(day.date, "EEEE, MMMM d, yyyy")}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Status banner */}
        <div className={cn("flex items-center gap-3 px-5 py-4", bannerBg[day.status])}>
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              iconBg[day.status]
            )}
          >
            <Icon className={cn("h-5 w-5", iconColor[day.status])} />
          </div>
          <div>
            <div className={cn("font-bold text-sm", cfg.numColor)}>
              {cfg.label}
            </div>
            <div className="text-[11px] text-slate-500">Attendance Status</div>
          </div>
          <span className={cn("ml-auto rounded-full px-2.5 py-1 text-[11px] font-bold", cfg.badgeBg, cfg.badgeText)}>
            {cfg.label}
          </span>
        </div>

        {/* Details */}
        <div className="px-5 py-4 space-y-3">
          {record ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 px-3 py-3 border border-slate-100">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Check In
                  </div>
                  <div className="mt-1.5 font-bold text-slate-900 text-sm">
                    {record.checkIn || "—"}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-3 border border-slate-100">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Check Out
                  </div>
                  <div className="mt-1.5 font-bold text-slate-900 text-sm">
                    {record.checkOut === "-" ? "Active" : record.checkOut || "—"}
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-indigo-50 px-4 py-3 flex items-center justify-between border border-indigo-100">
                <span className="text-xs font-semibold text-indigo-600">
                  Total Hours Worked
                </span>
                <span className="text-sm font-extrabold text-indigo-900">
                  {formatWorkHours(record.checkInTime, record.checkOutTime)}
                </span>
              </div>

              {record.locationStatus && (
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold",
                    record.locationStatus === "Verified"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      : "bg-rose-50 text-rose-700 border border-rose-100"
                  )}
                >
                  {record.locationStatus === "Verified" ? (
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                  )}
                  {record.locationStatus === "Verified"
                    ? `GPS Verified · ${record.distanceMeters ?? "?"}m from office`
                    : "Outside Office Range"}
                </div>
              )}

              {record.selfiePhoto && (
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                  <img
                    src={record.selfiePhoto}
                    alt="Check-in selfie"
                    className="h-10 w-10 rounded-lg object-cover ring-2 ring-emerald-200 scale-x-[-1] shrink-0"
                  />
                  <span className="text-xs font-semibold text-slate-600">
                    Check-in selfie captured
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="py-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <CalendarDays className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500 font-medium">
                {emptyMsg[day.status]}
              </p>
            </div>
          )}

          {/* ── Raise Query button (Employee only, past dates) ──────── */}
          {isEmployee && day.status !== "future" && onRaiseQuery && (
            <button
              onClick={onRaiseQuery}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-xs font-bold text-amber-700 transition-all hover:bg-amber-100 hover:border-amber-300 hover:shadow-sm active:scale-[0.98]"
            >
              <AlertCircle className="h-3.5 w-3.5" />
              Raise Attendance Query
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Widget ──────────────────────────────────────────────────────────────
export function AttendanceCalendarWidget({
  currentUser,
  compact = false,
}: {
  currentUser: SyncedEmployee;
  compact?: boolean;
}) {
  const [viewMonth, setViewMonth] = useState(new Date());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedDay, setSelectedDay] = useState<DayCell | null>(null);
  const [raiseQueryDay, setRaiseQueryDay] = useState<DayCell | null>(null);
  const [hoveredDay, setHoveredDay] = useState<{
    day: DayCell;
    rect: DOMRect;
  } | null>(null);

  const isEmployee = currentUser.role === "Employee";

  const todayStr = format(new Date(), "yyyy-MM-dd");

  // ── Data fetching ────────────────────────────────────────────────────────
  const loadRecords = useCallback(async () => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth() + 1;
    const data = await fetchMonthAttendance(currentUser.name, year, month);
    setRecords(data);
  }, [viewMonth, currentUser.name]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Refresh when attendance store changes (after check-in / check-out)
  useEffect(() => {
    const refresh = () => loadRecords();
    window.addEventListener("storage-sync", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("storage-sync", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [loadRecords]);

  // ── Build record map ─────────────────────────────────────────────────────
  const recordMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    records.forEach((r) => {
      if (r.date) map.set(r.date, r);
    });
    return map;
  }, [records]);

  // ── Build calendar grid ──────────────────────────────────────────────────
  const calendarDays = useMemo<DayCell[]>(() => {
    const start = startOfMonth(viewMonth);
    const end = endOfMonth(viewMonth);
    return eachDayOfInterval({ start, end }).map((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const dayOfWeek = getDay(date);
      const record = recordMap.get(dateStr);
      const status = resolveDayStatus(dateStr, todayStr, dayOfWeek, record);
      return {
        date,
        dateStr,
        dayNum: date.getDate(),
        dayOfWeek,
        status,
        record,
        isToday: dateStr === todayStr,
      };
    });
  }, [viewMonth, recordMap, todayStr]);

  const firstDayOffset = getDay(startOfMonth(viewMonth));

  // ── Summary counts ───────────────────────────────────────────────────────
  const summaryCounts = useMemo(() => {
    const counts: Record<DayStatus, number> = {
      present: 0,
      late: 0,
      leave: 0,
      absent: 0,
      future: 0,
      weekend: 0,
      "today-empty": 0,
    };
    calendarDays.forEach((d) => counts[d.status]++);
    return counts;
  }, [calendarDays]);

  // ── Cell handlers ────────────────────────────────────────────────────────
  const handleCellClick = (day: DayCell) => {
    if (day.status === "future") return;
    setSelectedDay(day);
  };

  const handleMouseEnter = (
    e: React.MouseEvent<HTMLButtonElement>,
    day: DayCell
  ) => {
    if (!day.record) return;
    setHoveredDay({ day, rect: e.currentTarget.getBoundingClientRect() });
  };

  const handleMouseLeave = () => setHoveredDay(null);

  return (
    <>
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        {/* ── Gradient Header ─────────────────────────────────────────── */}
        <div className={cn(
          "bg-gradient-to-r from-[#025085] via-indigo-700 to-violet-800",
          compact ? "px-4 py-2.5" : "px-5 py-4"
        )}>
          <div className="flex items-center justify-between">
            <div>
              {!compact && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-200">
                  <CalendarDays className="h-3 w-3" />
                  My Attendance Calendar
                </div>
              )}
              <div className={cn(
                "font-display font-extrabold text-white tracking-tight",
                compact ? "text-sm flex items-center gap-1.5" : "mt-0.5 text-xl"
              )}>
                {compact && <CalendarDays className="h-3.5 w-3.5 text-indigo-300" />}
                {format(viewMonth, compact ? "MMM yyyy" : "MMMM yyyy")}
              </div>
            </div>
            {/* Month navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewMonth((m) => subMonths(m, 1))}
                className={cn(
                  "flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/25 transition-colors",
                  compact ? "h-6 w-6" : "h-8 w-8"
                )}
                title="Previous month"
              >
                <ChevronLeft className={compact ? "h-3 w-3" : "h-4 w-4"} />
              </button>
              {!compact && (
                <button
                  onClick={() => setViewMonth(new Date())}
                  className="h-8 rounded-lg bg-white/10 px-3 text-[11px] font-bold text-white hover:bg-white/25 transition-colors"
                >
                  Today
                </button>
              )}
              <button
                onClick={() => setViewMonth((m) => addMonths(m, 1))}
                className={cn(
                  "flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/25 transition-colors",
                  compact ? "h-6 w-6" : "h-8 w-8"
                )}
                title="Next month"
              >
                <ChevronRight className={compact ? "h-3 w-3" : "h-4 w-4"} />
              </button>
            </div>
          </div>
        </div>

        <div className={compact ? "p-2.5" : "p-4"}>
          {/* ── Summary Strip (hidden in compact mode) ────────────────── */}
          {!compact && (
            <div className="mb-4 grid grid-cols-4 gap-2">
              {SUMMARY_STATS.map(({ key, label, icon: Icon, gradient, bg, numColor }) => (
                <div
                  key={key}
                  className={cn(
                    "rounded-xl p-2.5 text-center border border-slate-100/80",
                    bg
                  )}
                >
                  <div
                    className={cn(
                      "mx-auto mb-1.5 flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm",
                      gradient
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className={cn("font-display text-xl font-extrabold leading-none", numColor)}>
                    {summaryCounts[key]}
                  </div>
                  <div className="mt-0.5 text-[10px] font-semibold text-slate-500">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Day-of-week headers ────────────────────────────────────── */}
          <div className={cn("grid grid-cols-7", compact ? "gap-0.5 mb-0.5" : "gap-1 mb-1")}>
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div
                key={d}
                className={cn(
                  "text-center font-bold uppercase tracking-wider text-slate-400",
                  compact ? "py-0.5 text-[9px]" : "py-1 text-[10px]"
                )}
              >
                {d}
              </div>
            ))}
          </div>

          {/* ── Calendar Grid ─────────────────────────────────────────── */}
          <div className={cn("grid grid-cols-7", compact ? "gap-0.5" : "gap-1")}>
            {/* Leading offset cells */}
            {Array.from({ length: firstDayOffset }, (_, i) => (
              <div key={`offset-${i}`} />
            ))}

            {/* Day cells */}
            {calendarDays.map((day) => {
              const cfg = STATUS_CFG[day.status];
              const isFuture = day.status === "future";
              return (
                <button
                  key={day.dateStr}
                  disabled={isFuture}
                  onClick={() => handleCellClick(day)}
                  onMouseEnter={(e) => handleMouseEnter(e, day)}
                  onMouseLeave={handleMouseLeave}
                  className={cn(
                    "relative flex flex-col items-center justify-center rounded-lg border transition-all duration-150",
                    compact ? "h-8 rounded-md" : "h-11 rounded-xl",
                    cfg.cell,
                    day.isToday &&
                      "ring-2 ring-[#025085] ring-offset-1 shadow-sm",
                    !isFuture && "hover:scale-[1.08] hover:shadow-md active:scale-100",
                    isFuture && "cursor-not-allowed"
                  )}
                >
                  <span className={cn("font-bold leading-none", compact ? "text-[10px]" : "text-xs", cfg.numColor)}>
                    {day.dayNum}
                  </span>
                  {!compact && (
                    <span
                      className={cn(
                        "mt-1 h-1.5 w-1.5 rounded-full",
                        cfg.dot
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Legend (hidden in compact mode) ───────────────────────── */}
          {!compact && (
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-slate-100 pt-3">
              {(
                [
                  ["present", "Present"],
                  ["late", "Late"],
                  ["leave", "Leave"],
                  ["absent", "Absent"],
                  ["weekend", "Weekend"],
                  ["future", "Future"],
                ] as [DayStatus, string][]
              ).map(([status, label]) => (
                <span
                  key={status}
                  className="flex items-center gap-1 text-[10px] font-semibold text-slate-500"
                >
                  <span
                    className={cn(
                      "inline-block h-2 w-2 rounded-full",
                      STATUS_CFG[status].dot
                    )}
                  />
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Hover Tooltip (fixed, outside grid) ─────────────────────────── */}
      {hoveredDay && hoveredDay.day.record && (() => {
        const { day, rect } = hoveredDay;
        const rec = day.record!; // guarded by outer && check
        const showBelow = rect.top < 200; // flip if near top of viewport
        return (
          <div
            className="pointer-events-none fixed z-50"
            style={{
              left: rect.left + rect.width / 2,
              top: showBelow ? rect.bottom + 8 : rect.top - 8,
              transform: showBelow
                ? "translateX(-50%)"
                : "translate(-50%, -100%)",
            }}
          >
            <div className="relative rounded-xl bg-slate-900 px-3 py-2.5 text-xs shadow-2xl min-w-[170px]">
              <div className="mb-2 font-bold text-white/90">
                {format(day.date, "EEE, MMM d")}
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">Check In</span>
                  <span className="font-semibold text-white">
                    {rec.checkIn || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">Check Out</span>
                  <span className="font-semibold text-white">
                    {rec.checkOut === "-" ? "Active" : rec.checkOut || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-1 mt-1">
                  <span className="text-slate-400">Hours</span>
                  <span className="font-bold text-emerald-400">
                    {formatWorkHours(rec.checkInTime, rec.checkOutTime)}
                  </span>
                </div>
              </div>
              {/* Tooltip arrow */}
              <div
                className={cn(
                  "absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-slate-900",
                  showBelow ? "-top-[5px]" : "-bottom-[5px]"
                )}
              />
            </div>
          </div>
        );
      })()}

      {/* ── Day Detail Modal ─────────────────────────────────────────────── */}
      {selectedDay && (
        <DayDetailModal
          day={selectedDay}
          onClose={() => setSelectedDay(null)}
          isEmployee={isEmployee}
          onRaiseQuery={() => {
            setRaiseQueryDay(selectedDay);
            setSelectedDay(null);
          }}
        />
      )}

      {/* ── Raise Query Modal ────────────────────────────────────────── */}
      {raiseQueryDay && (() => {
        const snap = raiseQueryDay.record
          ? {
              checkIn:  raiseQueryDay.record.checkIn  || "—",
              checkOut: raiseQueryDay.record.checkOut === "-" ? "Active" : (raiseQueryDay.record.checkOut || "—"),
              status:   raiseQueryDay.record.status   || "—",
            }
          : undefined;
        const qData: QueryRaiseData = {
          date:    raiseQueryDay.date,
          dateStr: raiseQueryDay.dateStr,
          attendanceSnapshot: snap,
        };
        return (
          <RaiseQueryModal
            data={qData}
            currentUser={currentUser}
            onClose={() => setRaiseQueryDay(null)}
          />
        );
      })()}
    </>
  );
}
