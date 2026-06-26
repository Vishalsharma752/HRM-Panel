import { useState } from "react";
import {
  UserCog, UserPlus, Star, Plus, Download, ChevronRight,
  Award, Briefcase, FileText, CheckCircle2, Clock, TrendingUp,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { PageHeader, Card, CardHeader, Button, Badge, Avatar, Tabs, Progress } from "../components/ui";
import { onboardingQueue, performanceReviews } from "../data/employees";
import { useStore, type SyncedEmployee } from "../data/store";

const reviewTrend = [
  { month: "Jul", score: 4.1 },
  { month: "Aug", score: 4.2 },
  { month: "Sep", score: 4.3 },
  { month: "Oct", score: 4.3 },
  { month: "Nov", score: 4.5 },
  { month: "Dec", score: 4.6 },
];

const radarData = [
  { metric: "Productivity", current: 88, target: 85 },
  { metric: "Quality", current: 92, target: 85 },
  { metric: "Collaboration", current: 86, target: 80 },
  { metric: "Innovation", current: 78, target: 75 },
  { metric: "Punctuality", current: 94, target: 90 },
  { metric: "Leadership", current: 82, target: 80 },
];

export function HR() {
  const [employees] = useStore<SyncedEmployee[]>("employees", []);
  const [tab, setTab] = useState("onboarding");

  return (
    <div className="space-y-6">
      <PageHeader
        title="HR Management"
        subtitle="Onboarding, offboarding, performance & employee records"
        breadcrumb={[{ label: "Home" }, { label: "People" }, { label: "HR" }]}
        actions={
          <>
            <Button variant="secondary" size="md" leftIcon={<Download className="h-4 w-4" />}>Export</Button>
            <Button variant="gradient" size="md" leftIcon={<Plus className="h-4 w-4" />}>Onboard Employee</Button>
          </>
        }
      />

      <Card className="p-4">
        <Tabs value={tab} onChange={setTab} items={[
          { value: "onboarding", label: "Onboarding", count: onboardingQueue.length },
          { value: "offboarding", label: "Offboarding" },
          { value: "performance", label: "Performance Reviews" },
          { value: "records", label: "Employee Records" },
        ]} />
      </Card>

      {tab === "onboarding" && (
        <div className="space-y-6">
          {/* Onboarding overview */}
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: "Active Onboardings", value: onboardingQueue.length.toString(), color: "from-indigo-500 to-violet-600", icon: UserPlus },
              { label: "Day 1 Tasks Pending", value: "0", color: "from-amber-500 to-orange-600", icon: Clock },
              { label: "Avg. Time to Productivity", value: "—", color: "from-emerald-500 to-teal-600", icon: TrendingUp },
              { label: "30-Day Retention", value: "100%", color: "from-sky-500 to-cyan-600", icon: CheckCircle2 },
            ].map(s => (
              <div key={s.label} className="rounded-2xl border border-slate-200/80 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">{s.label}</span>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow ${s.color}`}>
                    <s.icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 font-display text-2xl font-extrabold text-slate-900">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Onboarding pipeline */}
          <Card>
            <CardHeader title="Active Onboardings" subtitle={`${onboardingQueue.length} employees in their first 30 days`} action={<Button variant="ghost" size="sm" rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>View all</Button>} />
            <div className="divide-y divide-slate-100">
              {onboardingQueue.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500 bg-slate-50/20">No active onboardings found.</div>
              ) : (
                onboardingQueue.map(o => (
                  <div key={o.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
                    <Avatar src={o.avatar} name={o.name} size={48} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900">{o.name}</span>
                        <Badge variant="indigo">{o.role}</Badge>
                        <Badge variant="success" dot>{o.stage}</Badge>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        Started {o.startDate} · Buddy: {o.buddy}
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <Progress value={parseInt(o.stage.match(/\d+/)?.[0] || "0") * 7} tone="indigo" />
                        <span className="text-[10px] font-bold text-slate-600">{o.stage} of 14</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm">View Checklist</Button>
                      <Button variant="primary" size="sm">Send Message</Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Onboarding checklist */}
          {onboardingQueue.length > 0 ? (
            <Card>
              <CardHeader title={`Onboarding Checklist — ${onboardingQueue[0].name}`} subtitle={`${onboardingQueue[0].stage} · ${onboardingQueue[0].role}`} action={<Badge variant="warning" dot>3 pending</Badge>} />
              <div className="p-6 pt-2 space-y-2">
                {[
                  { task: "Offer letter signed & documentation complete", done: true },
                  { task: "Welcome email sent with credentials", done: true },
                  { task: "Laptop & accessories delivered", done: true },
                  { task: "Buddy assigned (" + onboardingQueue[0].buddy + ")", done: true },
                  { task: "First-day orientation scheduled", done: false, due: "Today, 4 PM" },
                  { task: "GitHub & tool access granted", done: false, due: "Today" },
                  { task: "Team introduction meeting", done: false, due: "Tomorrow" },
                  { task: "30-day goal setting", done: false, due: "In 2 weeks" },
                ].map((c, i) => (
                  <div key={i} className={`flex items-center gap-3 rounded-xl border p-3 ${c.done ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200"}`}>
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${c.done ? "bg-emerald-500 text-white" : "border-2 border-slate-300"}`}>
                      {c.done && <CheckCircle2 className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <div className={`text-sm font-semibold ${c.done ? "text-slate-500 line-through" : "text-slate-900"}`}>{c.task}</div>
                      {!c.done && c.due && <div className="mt-0.5 text-[11px] text-amber-600 font-semibold">Due: {c.due}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card>
              <CardHeader title="Onboarding Checklist" subtitle="No active onboarding checklist" />
              <div className="p-8 text-center text-sm text-slate-500 bg-slate-50/20">
                No active onboarding checklist. Onboard a new employee to get started.
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === "offboarding" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: "Exits this Quarter", value: "4", color: "from-rose-500 to-pink-600" },
              { label: "Avg. Notice Period", value: "32 days", color: "from-amber-500 to-orange-600" },
              { label: "Attrition Rate", value: "8.4%", color: "from-emerald-500 to-teal-600" },
            ].map(s => (
              <div key={s.label} className="rounded-2xl border border-slate-200/80 bg-white p-4">
                <div className="text-xs font-semibold text-slate-500">{s.label}</div>
                <div className="mt-2 font-display text-2xl font-extrabold text-slate-900">{s.value}</div>
              </div>
            ))}
          </div>
          <Card>
            <CardHeader title="Upcoming Offboardings" subtitle="Employees in notice period" />
            <div className="divide-y divide-slate-100">
              <div className="p-8 text-center text-sm text-slate-500 bg-slate-50/20">No upcoming offboardings.</div>
            </div>
          </Card>
        </div>
      )}

      {tab === "performance" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Team Performance Trend" subtitle="Average review score — last 6 months" action={<Badge variant="success" dot>+0.4 vs Q3</Badge>} />
              <div className="p-4 pt-0 sm:p-6">
                <div className="h-[260px] w-full">
                  <ResponsiveContainer>
                    <LineChart data={reviewTrend}>
                      <CartesianGrid stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <YAxis domain={[3.5, 5]} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 12 }} />
                      <Line type="monotone" dataKey="score" stroke="#025085" strokeWidth={3} dot={{ r: 5, fill: "#025085", strokeWidth: 2, stroke: "white" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader title="Performance Radar" subtitle="Engineering · Q4 2024" />
              <div className="p-4 pt-0">
                <div className="h-[260px] w-full">
                  <ResponsiveContainer>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "#64748b" }} />
                      <PolarRadiusAxis tick={{ fontSize: 9, fill: "#94a3b8" }} />
                      <Radar name="Target" dataKey="target" stroke="#cbd5e1" fill="#cbd5e1" fillOpacity={0.3} />
                      <Radar name="Current" dataKey="current" stroke="#025085" fill="#025085" fillOpacity={0.4} />
                      <Tooltip contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 12 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader title="Recent Performance Reviews" subtitle="Q4 2024 cycle" />
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-3.5">Employee</th>
                    <th className="px-6 py-3.5">Reviewer</th>
                    <th className="px-6 py-3.5">Period</th>
                    <th className="px-6 py-3.5">Rating</th>
                    <th className="px-6 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {performanceReviews.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                        No performance reviews available.
                      </td>
                    </tr>
                  ) : (
                    performanceReviews.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/60">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar src={r.avatar} name={r.employee} size={36} />
                            <span className="font-semibold text-slate-900">{r.employee}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-slate-700">{r.reviewer}</td>
                        <td className="px-6 py-3.5 text-slate-600">{r.period}</td>
                        <td className="px-6 py-3.5">
                          <div className="inline-flex items-center gap-1.5">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map(i => <Star key={i} className={`h-3.5 w-3.5 ${i <= Math.round(r.rating) ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />)}
                            </div>
                            <span className="font-bold text-slate-900">{r.rating}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5"><Badge variant={r.status === "Completed" ? "success" : "warning"} dot>{r.status}</Badge></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === "records" && (
        <Card>
          <CardHeader title="Employee Records" subtitle="Personal info, documents & history" />
          <div className="p-6 grid gap-4 sm:grid-cols-3">
            {[
              { label: "Personal Info", count: employees.length, icon: UserCog, color: "from-indigo-500 to-violet-600" },
              { label: "Documents", count: employees.length * 5, icon: FileText, color: "from-emerald-500 to-teal-600" },
              { label: "Compensation", count: employees.length, icon: Briefcase, color: "from-amber-500 to-orange-600" },
              { label: "Certifications", count: employees.length, icon: Award, color: "from-rose-500 to-pink-600" },
              { label: "Training History", count: employees.length * 2, icon: TrendingUp, color: "from-sky-500 to-cyan-600" },
              { label: "Performance History", count: employees.length * 3, icon: Star, color: "from-fuchsia-500 to-purple-600" },
            ].map(r => (
              <button key={r.label} className="group flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-left transition-all hover:border-indigo-200 hover:shadow-md">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow ${r.color}`}>
                  <r.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-slate-900">{r.label}</div>
                  <div className="text-[11px] text-slate-500">{r.count} records</div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-600" />
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
