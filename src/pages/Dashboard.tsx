import { useMemo } from "react";
import {
  Users, UserCheck, UserX, Plane, UserPlus, TrendingUp, ArrowUpRight,
  Calendar, Clock, ChevronRight, Sparkles, CheckCircle2, AlertCircle, Briefcase,
  Timer, Activity, Zap, FileText, Download, Plus, Cake,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis,
  Tooltip, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";
import { StatCard, Card, CardHeader, Avatar, Badge, Button, Progress } from "../components/ui";
import {
  kpiTrend, attendanceTrend, departmentDistribution, performanceData,
  departments,
} from "../data/employees";
import { useStore, SyncedEmployee, LeaveRequest, AttendanceRecord, ActivityRecord, Holiday } from "../data/store";
import { Task } from "../data/tasksStore";

const tooltipStyle = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  fontSize: 12,
  fontWeight: 600,
  boxShadow: "0 8px 24px -8px rgba(15,23,42,0.12)",
  padding: "8px 12px",
};

const COLORS = ["#025085", "#00538C", "#E81D3B", "#10b981", "#f59e0b", "#0ea5e9", "#8b5cf6", "#a855f7"];

export function Dashboard({ onNavigate, currentUser }: { onNavigate: (p: any) => void; currentUser: SyncedEmployee }) {
  const [employees] = useStore<SyncedEmployee[]>("employees", []);
  const [tasks] = useStore<Task[]>("tasks", []);
  const [leaves] = useStore<LeaveRequest[]>("leaves", []);
  const [attendance, setAttendance] = useStore<AttendanceRecord[]>("attendance", []);
  const [activities, setActivities] = useStore<ActivityRecord[]>("activities", []);
  const [holidays] = useStore<Holiday[]>("holidays", []);

  // ── Dynamic time-based greeting ──────────────────────────────────────────
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5  && hour < 12) return "Good Morning ☀️";
    if (hour >= 12 && hour < 17) return "Good Afternoon 🌤️";
    if (hour >= 17 && hour < 21) return "Good Evening 🌇";
    return "Good Night 🌙";
  };
  const greeting = getGreeting();

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const upcomingHolidays = useMemo(() => {
    return holidays
      .filter(h => h.date >= todayStr)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [holidays, todayStr]);

  const nextHoliday = upcomingHolidays[0] || null;

  const nextHolidayDays = useMemo(() => {
    if (!nextHoliday) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(nextHoliday.date);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [nextHoliday]);

  const getBadgeColor = (type: Holiday["type"]) => {
    const colors = {
      National: "bg-rose-100 text-rose-700 border-none",
      Company: "bg-blue-100 text-[#025085] border-none",
      Optional: "bg-amber-100 text-amber-700 border-none",
      Festival: "bg-indigo-100 text-indigo-700 border-none",
    };
    return colors[type] || "bg-slate-100 text-slate-700 border-none";
  };

  // Employee Dashboard View
  if (currentUser.role === "Employee") {
    const userAttendance = attendance.find(a => a.name === currentUser.name && a.date === todayStr);
    
    const myTasks = tasks.filter(t => t.assignee === currentUser.name);
    const myPendingTasksCount = myTasks.filter(t => t.status !== "Completed").length;
    
    const myLeaves = leaves.filter(l => l.employee === currentUser.name);
    const approvedLeaveDays = myLeaves.filter(l => l.status === "Approved").reduce((sum, l) => sum + l.days, 0);
    const leaveBalance = Math.max(0, 24 - approvedLeaveDays);

    const handleCheckIn = () => {
      const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const record: AttendanceRecord = {
        id: currentUser.id,
        name: currentUser.name,
        department: currentUser.department,
        checkIn: timeStr,
        checkOut: "—",
        status: "Present",
        avatar: currentUser.avatar,
        date: todayStr
      };
      
      setAttendance(prev => {
        const idx = prev.findIndex(a => a.name === currentUser.name);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = record;
          return updated;
        }
        return [...prev, record];
      });

      const newActivity: ActivityRecord = {
        id: Date.now(),
        user: currentUser.name,
        action: "checked in",
        target: "for today",
        time: "Just now",
        avatar: currentUser.avatar
      };
      setActivities(prev => [newActivity, ...prev]);
    };

    const handleCheckOut = () => {
      const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      setAttendance(prev => {
        return prev.map(a => {
          if (a.name === currentUser.name) {
            return { ...a, checkOut: timeStr, status: "Present" };
          }
          return a;
        });
      });

      const newActivity: ActivityRecord = {
        id: Date.now(),
        user: currentUser.name,
        action: "checked out",
        target: "for today",
        time: "Just now",
        avatar: currentUser.avatar
      };
      setActivities(prev => [newActivity, ...prev]);
    };

    return (
      <div className="space-y-6">
        {/* Employee Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 p-6 text-white shadow-2xl shadow-indigo-900/30 sm:p-8">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-indigo-500 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-violet-500 blur-3xl" />
          </div>
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-indigo-100 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>Employee Portal · {currentUser.department}</span>
              </div>
              <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                {greeting}, {currentUser.name.split(" ")[0]} 👋
              </h1>
              <p className="mt-2 max-w-xl text-sm text-indigo-100/80 sm:text-base">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button variant="gradient" size="md" onClick={() => onNavigate("leave")} leftIcon={<Calendar className="h-4 w-4" />}>Apply Leave</Button>
                <Button variant="secondary" size="md" className="bg-white/10 text-white border-white/15 hover:bg-white/20" onClick={() => onNavigate("tasks")} leftIcon={<Clock className="h-4 w-4" />}>View Tasks</Button>
              </div>
            </div>
          </div>
        </div>

        {/* Employee Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard 
            label="My Pending Tasks" 
            value={myPendingTasksCount.toString()} 
            delta="Assigned to you" 
            deltaTone="flat" 
            accent="indigo" 
            icon={<Briefcase className="h-5 w-5" />}
          />
          <StatCard 
            label="Leaves Remaining" 
            value={leaveBalance.toString()} 
            delta={`${approvedLeaveDays} days taken`} 
            deltaTone="up" 
            accent="emerald" 
            icon={<Plane className="h-5 w-5" />}
          />
          <StatCard 
            label="Onboarding Progress" 
            value="100%" 
            delta="Fully onboarded" 
            deltaTone="up" 
            accent="violet" 
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
        </div>

        {/* Tasks, Leaves, and Holidays Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Tasks List */}
          <Card>
            <CardHeader 
              title="My Assigned Tasks" 
              subtitle="Current priorities and progress" 
              action={<Button variant="ghost" size="sm" onClick={() => onNavigate("tasks")} rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>All Tasks</Button>} 
            />
            <div className="divide-y divide-slate-100">
              {myTasks.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">No tasks assigned to you.</div>
              ) : (
                myTasks.slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-center gap-3 px-6 py-3.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-900">{t.title}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                        <span>Due {t.due}</span>
                        <span>·</span>
                        <span className="capitalize">{t.status.replace("_", " ")}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Progress value={t.progress} tone={t.status === "Completed" ? "emerald" : "indigo"} />
                        <span className="text-[10px] font-bold text-slate-600">{t.progress}%</span>
                      </div>
                    </div>
                    <Badge variant={t.priority === "High" || t.priority === "Urgent" ? "danger" : t.priority === "Medium" ? "warning" : "neutral"}>{t.priority}</Badge>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Leaves List */}
          <Card>
            <CardHeader 
              title="My Leaves History" 
              subtitle="Recent requests and status" 
              action={<Button variant="ghost" size="sm" onClick={() => onNavigate("leave")} rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>Leave Portal</Button>} 
            />
            <div className="divide-y divide-slate-100">
              {myLeaves.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">No leave requests found.</div>
              ) : (
                myLeaves.slice(0, 5).map(l => (
                  <div key={l.id} className="flex items-center justify-between px-6 py-3.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900">{l.type}</div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {l.from} to {l.to} · {l.days} {l.days === 1 ? "day" : "days"}
                      </div>
                    </div>
                    <Badge variant={l.status === "Approved" ? "success" : l.status === "Rejected" ? "danger" : "warning"}>
                      {l.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Upcoming Holidays & Countdown Widget */}
          <Card>
            <CardHeader 
              title="Upcoming Holidays" 
              subtitle="India · 2026" 
              action={<Button variant="ghost" size="sm" onClick={() => onNavigate("holidays")} rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>Calendar</Button>}
            />
            
            {nextHoliday && nextHolidayDays !== null && (
              <div className="mx-6 my-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100/50 p-4 flex items-center justify-between shadow-sm">
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Next Company Holiday</div>
                  <div className="text-sm font-extrabold text-slate-900 mt-0.5 truncate">{nextHoliday.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {new Date(nextHoliday.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-extrabold text-indigo-700 tracking-tight">
                    {nextHolidayDays === 0 ? "Today" : `in ${nextHolidayDays}`}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 mt-0.5">
                    {nextHolidayDays === 1 ? "Day" : nextHolidayDays === 0 ? "🎉" : "Days"} Left
                  </div>
                </div>
              </div>
            )}

            <div className="divide-y divide-slate-100">
              {upcomingHolidays.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">No upcoming holidays.</div>
              ) : (
                upcomingHolidays.slice(0, 5).map((h: Holiday) => {
                  const dateObj = new Date(h.date);
                  const dateDay = dateObj.getDate();
                  const dateMonthStr = dateObj.toLocaleDateString("en-IN", { month: "short" });
                  const dayName = dateObj.toLocaleDateString("en-IN", { weekday: "long" });
                  const badgeColor = getBadgeColor(h.type);
                  
                  return (
                    <div key={h.id} className="flex items-center gap-4 px-6 py-3.5">
                      <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{dateMonthStr}</div>
                        <div className="font-display text-base font-extrabold text-slate-900 leading-none">{dateDay}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-900">{h.title}</div>
                        <div className="text-[11px] text-slate-500">{dayName}</div>
                      </div>
                      <Badge variant="neutral" className={badgeColor}>{h.type}</Badge>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Admin Dashboard View
  const totalEmployees = employees.length;
  const presentToday = attendance.filter(a => a.status === "Present" || a.status === "Late").length;
  const absentToday = attendance.filter(a => a.status === "Absent").length;
  const onLeaveToday = attendance.filter(a => a.status === "On Leave").length;
  const pendingLeavesCount = leaves.filter(l => l.status === "Pending").length;
  const pendingTasksCount = tasks.filter(t => t.status !== "Completed").length;
  const activeEmployees = employees.filter(e => e.status === "Active").length;
  const departmentCount = new Set(employees.map(e => e.department)).size;

  return (
    <div className="space-y-6">
      {/* Hero / Greeting */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 p-6 text-white shadow-2xl shadow-indigo-900/30 sm:p-8">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-indigo-500 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-violet-500 blur-3xl" />
        </div>
        <div className="relative grid gap-6 lg:grid-cols-3 lg:items-center">
          <div className="lg:col-span-2">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-indigo-100 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>Welcome back, {currentUser.name} — here's your workplace today</span>
            </div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              {greeting} 👋
            </h1>
            <p className="mt-2 max-w-xl text-sm text-indigo-100/80 sm:text-base">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {totalEmployees} employees across {departmentCount} departments. You have <span className="font-semibold text-white">{pendingLeavesCount} pending leave requests</span> and <span className="font-semibold text-white">{pendingTasksCount} pending tasks</span> to track.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="gradient" size="md" onClick={() => onNavigate("employees")} leftIcon={<Plus className="h-4 w-4" />}>Add Employee</Button>
              <Button variant="secondary" size="md" className="bg-white/10 text-white border-white/15 hover:bg-white/20" onClick={() => onNavigate("reports")} leftIcon={<FileText className="h-4 w-4" />}>Generate Report</Button>
              <Button variant="ghost" size="md" className="text-white hover:bg-white/10" onClick={() => onNavigate("reports")} rightIcon={<ArrowUpRight className="h-4 w-4" />}>View Insights</Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Present" value={presentToday.toString()} icon={<CheckCircle2 className="h-4 w-4" />} />
            <MiniStat label="On Leave" value={onLeaveToday.toString()} icon={<Plane className="h-4 w-4" />} tone="amber" />
            <MiniStat label="Absent" value={absentToday.toString()} icon={<UserX className="h-4 w-4" />} tone="rose" />
            <MiniStat label="Late" value={attendance.filter(a => a.status === "Late").length.toString()} icon={<Timer className="h-4 w-4" />} tone="emerald" />
          </div>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Employees" value={totalEmployees.toString()} delta={`+${employees.filter(e => e.joinDate.startsWith("2024") || e.joinDate.startsWith("2025")).length} new`} deltaTone="up" accent="indigo" icon={<Users className="h-5 w-5" />}
          spark={<MiniSpark data={totalEmployees > 0 ? [totalEmployees] : []} color="#025085" />}
        />
        <StatCard label="Present Today" value={presentToday.toString()} delta={`${((presentToday / (totalEmployees || 1)) * 100).toFixed(1)}% rate`} deltaTone="up" accent="emerald" icon={<UserCheck className="h-5 w-5" />}
          spark={<MiniSpark data={presentToday > 0 ? [presentToday] : []} color="#10b981" />}
        />
        <StatCard label="Absent Today" value={absentToday.toString()} delta="Unexcused" deltaTone="down" accent="rose" icon={<UserX className="h-5 w-5" />}
          spark={<MiniSpark data={absentToday > 0 ? [absentToday] : []} color="#E81D3B" />}
        />
        <StatCard label="On Leave" value={onLeaveToday.toString()} delta={`${pendingLeavesCount} pending`} deltaTone="flat" accent="amber" icon={<Plane className="h-5 w-5" />}
          spark={<MiniSpark data={onLeaveToday > 0 ? [onLeaveToday] : []} color="#f59e0b" />}
        />
        <StatCard label="Pending Tasks" value={pendingTasksCount.toString()} delta="Active workflows" deltaTone="up" accent="violet" icon={<UserPlus className="h-5 w-5" />}
          spark={<MiniSpark data={pendingTasksCount > 0 ? [pendingTasksCount] : []} color="#00538C" />}
        />
        <StatCard label="Active Employees" value={activeEmployees.toString()} delta="Active directory" deltaTone="up" accent="sky" icon={<Briefcase className="h-5 w-5" />}
          spark={<MiniSpark data={activeEmployees > 0 ? [activeEmployees] : []} color="#0ea5e9" />}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Attendance trend - large */}
        <Card className="xl:col-span-2">
          <CardHeader
            title="Workforce Analytics"
            subtitle="Attendance & productivity trends — last 6 months"
            action={
              <div className="flex items-center gap-2">
                <div className="hidden items-center gap-3 text-xs text-slate-500 sm:flex">
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-indigo-500" /> Attendance</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Productivity</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-500" /> Headcount</span>
                </div>
                <Button variant="secondary" size="sm" rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>This Quarter</Button>
              </div>
            }
          />
          <div className="p-4 pt-2 sm:p-6">
            <div className="h-[300px] w-full flex items-center justify-center">
              {employees.length === 0 ? (
                <div className="text-slate-400 text-sm font-semibold">No workforce metrics available</div>
              ) : (
                <ResponsiveContainer>
                  <AreaChart data={kpiTrend} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#025085" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#025085" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00538C" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#00538C" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#f1f5f9" strokeDasharray="0" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="employees" stroke="#00538C" strokeWidth={2.5} fill="url(#g3)" />
                    <Area type="monotone" dataKey="attendance" stroke="#025085" strokeWidth={2.5} fill="url(#g1)" />
                    <Area type="monotone" dataKey="productivity" stroke="#10b981" strokeWidth={2.5} fill="url(#g2)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </Card>

        {/* Department distribution */}
        <Card>
          <CardHeader
            title="Department Overview"
            subtitle="Headcount distribution"
            action={<Button variant="ghost" size="sm" onClick={() => onNavigate("departments")} rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>All</Button>}
          />
          <div className="p-6 flex flex-col items-center justify-center min-h-[250px]">
            {totalEmployees === 0 ? (
              <div className="flex flex-col items-center justify-center text-center text-slate-400 text-xs">
                <Users className="h-8 w-8 text-slate-300 mb-1" />
                <span>No department data available</span>
              </div>
            ) : (
              <>
                <div className="relative mx-auto h-[200px] w-[200px] flex items-center justify-center">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={departmentDistribution} cx="50%" cy="50%" innerRadius={62} outerRadius={88} paddingAngle={3} dataKey="value">
                        {departmentDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col items-center">
                    <div className="font-display text-2xl font-extrabold text-slate-900">{totalEmployees}</div>
                    <div className="text-[11px] font-medium text-slate-500">Total people</div>
                  </div>
                </div>
                <div className="mt-4 w-full space-y-2">
                  {departmentDistribution.slice(0, 5).map((d) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} />
                        <span className="font-medium text-slate-700">{d.name}</span>
                      </div>
                      <span className="font-bold text-slate-900">
                        {employees.filter(e => e.department === d.name).length || d.value}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Second charts row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Weekly Attendance"
            subtitle="This week · Mon — Sun"
            action={<Badge variant="success" dot>+4.2% vs last week</Badge>}
          />
          <div className="p-4 pt-0 sm:p-6">
            <div className="h-[260px] w-full flex items-center justify-center">
              {attendance.length === 0 ? (
                <div className="text-slate-400 text-sm font-semibold">No attendance records available</div>
              ) : (
                <ResponsiveContainer>
                  <BarChart data={attendanceTrend} margin={{ top: 10, right: 8, left: -10, bottom: 0 }} barCategoryGap={18}>
                    <CartesianGrid stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f1f5f9", radius: 8 }} />
                    <Bar dataKey="present" stackId="a" fill="#025085" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="leave" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="absent" stackId="a" fill="#E81D3B" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Productivity Index" subtitle="By department" action={<Badge variant="indigo" dot>Live</Badge>} />
          <div className="p-6 flex flex-col justify-center min-h-[200px]">
            {performanceData.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center text-slate-400 text-xs py-8">
                <TrendingUp className="h-8 w-8 text-slate-300 mb-1" />
                <span>No performance records available</span>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {performanceData.map((d) => (
                    <div key={d.name}>
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">{d.name}</span>
                        <span className="font-bold text-slate-900">{d.score}%</span>
                      </div>
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${d.score}%` }} />
                        <div className="absolute inset-y-0 w-px bg-slate-300" style={{ left: `${d.target}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-center gap-2 rounded-xl bg-indigo-50/60 p-3 text-xs text-indigo-700">
                  <Zap className="h-4 w-4" />
                  <span><span className="font-bold">+5.2%</span> improvement vs Q3 — engineering & design lead the pack.</span>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Quick actions + Recent activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Quick Actions" subtitle="Common workflows" />
          <div className="grid grid-cols-2 gap-2.5 p-4 pt-2 sm:p-6 sm:pt-2">
            <QuickAction icon={<UserPlus className="h-5 w-5" />} label="Add Employee" color="from-indigo-500 to-violet-600" onClick={() => onNavigate("employees")} />
            <QuickAction icon={<Calendar className="h-5 w-5" />} label="Approve Leave" color="from-emerald-500 to-teal-600" onClick={() => onNavigate("leave")} badge={pendingLeavesCount || undefined} />
            <QuickAction icon={<Clock className="h-5 w-5" />} label="Mark Attendance" color="from-amber-500 to-orange-600" onClick={() => onNavigate("attendance")} />
            <QuickAction icon={<FileText className="h-5 w-5" />} label="Run Payroll" color="from-sky-500 to-cyan-600" onClick={() => onNavigate("payroll")} />
            <QuickAction icon={<TrendingUp className="h-5 w-5" />} label="View Reports" color="from-rose-500 to-pink-600" onClick={() => onNavigate("reports")} />
            <QuickAction icon={<ListTodoIcon />} label="Assign Task" color="from-fuchsia-500 to-purple-600" onClick={() => onNavigate("tasks")} />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent Activity"
            subtitle="Latest actions across the company"
            action={<Button variant="ghost" size="sm" rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>View all</Button>}
          />
          <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
            {activities.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">No recent activities.</div>
            ) : (
              activities.slice(0, 8).map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-6 py-3.5">
                  <Avatar src={a.avatar} name={a.user} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-slate-800">
                      <span className="font-semibold text-slate-900">{a.user}</span>{" "}
                      <span className="text-slate-600">{a.action}</span>{" "}
                      <span className="font-semibold text-slate-900">{a.target}</span>
                    </div>
                    <div className="mt-0.5 text-[11px] font-medium text-slate-500">{a.time}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Department overview + Pulse */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Department Performance"
            subtitle="Heads, headcount & productivity score"
            action={<Button variant="secondary" size="sm" rightIcon={<Download className="h-3.5 w-3.5" />}>Export</Button>}
          />
          <div className="grid gap-px bg-slate-100 sm:grid-cols-2">
            {departments.slice(0, 6).map((d) => {
              const deptEmployees = employees.filter(e => e.department === d.name);
              const deptCount = deptEmployees.length;
              const headEmp = deptEmployees.find(e => 
                e.role === "Admin" || 
                e.designation.toLowerCase().includes("head") || 
                e.designation.toLowerCase().includes("director") ||
                e.designation.toLowerCase().includes("vp") ||
                e.designation.toLowerCase().includes("lead") ||
                e.designation.toLowerCase().includes("founder")
              ) || deptEmployees[0] || null;
              const headName = headEmp ? headEmp.name : "—";
              const progressVal = deptCount > 0 ? 70 + (deptCount % 25) : 0;

              return (
                <button key={d.name} onClick={() => onNavigate("departments")} className="group flex items-center gap-3.5 bg-white p-4 text-left transition-colors hover:bg-slate-50">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg shadow-indigo-500/20 ${d.color}`}>
                    <BuildingIcon name={d.icon} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-bold text-slate-900">{d.name}</div>
                      <Badge variant="indigo">{deptCount} ppl</Badge>
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-slate-500">Head: {headName}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <Progress value={progressVal} tone="indigo" />
                      <span className="text-[10px] font-bold text-slate-600">{progressVal}%</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-indigo-600" />
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader title="Today's Pulse" subtitle="What's happening now" />
          <div className="space-y-3 p-6 pt-2">
            <PulseItem
              icon={<Cake className="h-4 w-4" />}
              color="bg-pink-100 text-pink-700"
              title="Birthdays this week"
              sub="No birthdays this week"
            />
            <PulseItem
              icon={<Plane className="h-4 w-4" />}
              color="bg-amber-100 text-amber-700"
              title={`${pendingLeavesCount} leave requests pending`}
              sub="Awaiting review"
              cta="Review"
              onClick={() => onNavigate("leave")}
            />
            <PulseItem
              icon={<Activity className="h-4 w-4" />}
              color="bg-emerald-100 text-emerald-700"
              title="Onboarding in progress"
              sub={`${employees.filter(e => e.status === "Probation").length} new joiners in week 1`}
            />
            <PulseItem
              icon={<AlertCircle className="h-4 w-4" />}
              color="bg-rose-100 text-rose-700"
              title="Urgent Tasks"
              sub={`${tasks.filter(t => t.priority === "Urgent" && t.status !== "Completed").length} tasks need attention`}
              cta="Review"
              onClick={() => onNavigate("tasks")}
            />
          </div>
        </Card>
      </div>

      {/* Active Tasks + Holidays */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Active Tasks" subtitle="In progress across teams" action={<Button variant="ghost" size="sm" onClick={() => onNavigate("tasks")} rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>All tasks</Button>} />
          <div className="divide-y divide-slate-100">
            {tasks.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">No active tasks.</div>
            ) : (
              tasks.slice(0, 4).map(t => (
                <div key={t.id} className="flex items-center gap-3 px-6 py-3.5">
                  <Avatar src={t.assigneeAvatar} name={t.assignee} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-900">{t.title}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                      <span>{t.assignee}</span>
                      <span>·</span>
                      <span>Due {t.due}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Progress value={t.progress} tone={t.status === "Completed" ? "emerald" : "indigo"} />
                      <span className="text-[10px] font-bold text-slate-600">{t.progress}%</span>
                    </div>
                  </div>
                  <Badge variant={t.priority === "High" || t.priority === "Urgent" ? "danger" : t.priority === "Medium" ? "warning" : "neutral"}>{t.priority}</Badge>
                </div>
              ))
            )}
          </div>
        </Card>


        <Card>
          <CardHeader 
            title="Upcoming Holidays" 
            subtitle="India · 2026" 
            action={<Button variant="ghost" size="sm" onClick={() => onNavigate("holidays")} rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>Calendar</Button>}
          />
          
          {nextHoliday && nextHolidayDays !== null && (
            <div className="mx-6 my-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100/50 p-4 flex items-center justify-between shadow-sm">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Next Company Holiday</div>
                <div className="text-sm font-extrabold text-slate-900 mt-0.5 truncate">{nextHoliday.title}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {new Date(nextHoliday.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-extrabold text-indigo-700 tracking-tight">
                  {nextHolidayDays === 0 ? "Today" : `in ${nextHolidayDays}`}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 mt-0.5">
                  {nextHolidayDays === 1 ? "Day" : nextHolidayDays === 0 ? "🎉" : "Days"} Left
                </div>
              </div>
            </div>
          )}

          <div className="divide-y divide-slate-100">
            {upcomingHolidays.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">No upcoming holidays.</div>
            ) : (
              upcomingHolidays.slice(0, 5).map((h: Holiday) => {
                const dateObj = new Date(h.date);
                const dateDay = dateObj.getDate();
                const dateMonthStr = dateObj.toLocaleDateString("en-IN", { month: "short" });
                const dayName = dateObj.toLocaleDateString("en-IN", { weekday: "long" });
                const badgeColor = getBadgeColor(h.type);
                
                return (
                  <div key={h.id} className="flex items-center gap-4 px-6 py-3.5">
                    <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{dateMonthStr}</div>
                      <div className="font-display text-base font-extrabold text-slate-900 leading-none">{dateDay}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900">{h.title}</div>
                      <div className="text-[11px] text-slate-500">{dayName}</div>
                    </div>
                    <Badge variant="neutral" className={badgeColor}>{h.type}</Badge>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------- subcomponents ---------- */
function MiniStat({ label, value, icon, tone = "indigo" }: { label: string; value: string; icon: React.ReactNode; tone?: "indigo" | "emerald" | "amber" | "rose" }) {
  const map = {
    indigo: "from-indigo-500/20 to-violet-500/20 text-indigo-200",
    emerald: "from-emerald-500/20 to-teal-500/20 text-emerald-200",
    amber: "from-amber-500/20 to-orange-500/20 text-amber-200",
    rose: "from-rose-500/20 to-pink-500/20 text-rose-200",
  };
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
      <div className={`mb-2 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${map[tone]}`}>{icon}</div>
      <div className="font-display text-2xl font-extrabold leading-none">{value}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/60">{label}</div>
    </div>
  );
}

function MiniSpark({ data, color }: { data: number[]; color: string }) {
  return (
    <div className="h-8 w-24">
      <ResponsiveContainer>
        <AreaChart data={data.map((v) => ({ v }))}>
          <defs>
            <linearGradient id={`s-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#s-${color})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function QuickAction({ icon, label, color, onClick, badge }: { icon: React.ReactNode; label: string; color: string; onClick?: () => void; badge?: number }) {
  return (
    <button onClick={onClick} className="group relative flex flex-col items-start gap-2.5 rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition-all hover:border-transparent hover:shadow-lg hover:shadow-indigo-500/10">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ${color}`}>{icon}</div>
      <div className="text-xs font-bold text-slate-800">{label}</div>
      {badge && <span className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">{badge}</span>}
    </button>
  );
}

function PulseItem({ icon, color, title, sub, cta, onClick }: { icon: React.ReactNode; color: string; title: string; sub: string; cta?: string; onClick?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="text-[11px] text-slate-500">{sub}</div>
      </div>
      {cta && <button onClick={onClick} className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700">{cta}</button>}
    </div>
  );
}

function BuildingIcon({ name }: { name: string }) {
  // Minimal inline icons for departments
  const map: Record<string, React.ReactNode> = {
    Code2: <span className="text-base">{"</>"}</span>,
    TrendingUp: <TrendingUp className="h-5 w-5" />,
    Megaphone: <span className="text-base">📣</span>,
    Users: <Users className="h-5 w-5" />,
    Banknote: <span className="text-base">₹</span>,
    Settings: <span className="text-base">⚙️</span>,
    Headphones: <span className="text-base">🎧</span>,
    Palette: <span className="text-base">🎨</span>,
  };
  return map[name] || <Briefcase className="h-5 w-5" />;
}

function ListTodoIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="6" height="6" rx="1" /><rect x="15" y="5" width="6" height="6" rx="1" />
      <rect x="3" y="15" width="6" height="6" rx="1" /><rect x="15" y="15" width="6" height="6" rx="1" />
    </svg>
  );
}
