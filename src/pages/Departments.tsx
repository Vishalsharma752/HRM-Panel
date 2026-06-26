import { useState, useMemo } from "react";
import {
  Building2, Users, TrendingUp, ChevronRight, Plus, Download, Briefcase,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { PageHeader, Card, CardHeader, Button, Badge, Avatar, Tabs } from "../components/ui";
import { departments } from "../data/employees";
import { useStore, type SyncedEmployee } from "../data/store";

const COLORS = ["#025085", "#00538C", "#E81D3B", "#10b981", "#f59e0b", "#0ea5e9", "#8b5cf6", "#a855f7"];

export function Departments() {
  const [employees] = useStore<SyncedEmployee[]>("employees", []);
  
  const processedDepartments = useMemo(() => {
    return departments.map(d => {
      const deptEmployees = employees.filter(e => e.department === d.name);
      const headEmp = deptEmployees.find(e => 
        e.role === "Admin" || 
        e.designation.toLowerCase().includes("head") || 
        e.designation.toLowerCase().includes("director") ||
        e.designation.toLowerCase().includes("vp") ||
        e.designation.toLowerCase().includes("lead") ||
        e.designation.toLowerCase().includes("founder")
      ) || deptEmployees[0] || null;

      return {
        ...d,
        count: deptEmployees.length,
        head: headEmp ? headEmp.name : "—"
      };
    });
  }, [employees]);

  const [active, setActive] = useState(() => processedDepartments[0]?.name || "Engineering");
  const [tab, setTab] = useState("structure");

  const dept = processedDepartments.find(d => d.name === active) || processedDepartments[0];
  const team = employees.filter(e => e.department === active);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        subtitle="Organize teams, track headcount and analyze performance"
        breadcrumb={[{ label: "Home" }, { label: "People" }, { label: "Departments" }]}
        actions={
          <>
            <Button variant="secondary" size="md" leftIcon={<Download className="h-4 w-4" />}>Export</Button>
            <Button variant="gradient" size="md" leftIcon={<Plus className="h-4 w-4" />}>New Department</Button>
          </>
        }
      />

      {/* Department cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {processedDepartments.map((d, i) => (
          <button key={d.name} onClick={() => setActive(d.name)} className={`group relative overflow-hidden rounded-2xl border bg-white p-4 text-left transition-all ${active === d.name ? "border-indigo-300 shadow-lg shadow-indigo-500/10" : "border-slate-200/80 hover:border-slate-300 hover:shadow-md"}`}>
            <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br opacity-20 blur-2xl ${d.color}`} />
            <div className="relative flex items-start justify-between">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg ${d.color}`}>
                <Building2 className="h-5 w-5" />
              </div>
              <Badge variant="indigo">{d.count} members</Badge>
            </div>
            <div className="relative mt-3">
              <div className="font-display text-base font-extrabold text-slate-900">{d.name}</div>
              <div className="mt-0.5 text-[11px] text-slate-500">Head: {d.head}</div>
            </div>
            <div className="relative mt-3 flex items-center gap-3 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {Math.floor(d.count * 0.85)} active</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {82 + (i % 15)}% perf</span>
            </div>
          </button>
        ))}
      </div>

      {/* Active department detail */}
      <Card>
        <CardHeader
          title={dept.name}
          subtitle={`${dept.count} members · led by ${dept.head}`}
          action={
            <div className="flex items-center gap-2">
              <Tabs value={tab} onChange={setTab} items={[
                { value: "structure", label: "Team" },
                { value: "analytics", label: "Analytics" },
                { value: "open", label: "Open Roles", count: 2 },
              ]} />
            </div>
          }
        />
        {tab === "structure" && (
          <div className="p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Department Head</div>
                <div className="mt-3 flex items-center gap-3">
                  <Avatar name={dept.head} size={48} />
                  <div>
                    <div className="font-bold text-slate-900">{dept.head}</div>
                    <div className="text-[11px] text-slate-500">{dept.name} · Director</div>
                  </div>
                </div>
              </div>
              {team.slice(0, 5).map((e) => (
                <div key={e.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar src={e.avatar} name={e.name} size={42} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-slate-900">{e.name}</div>
                      <div className="truncate text-[11px] text-slate-500">{e.designation}</div>
                    </div>
                    <Badge variant={e.status === "Active" ? "success" : e.status === "On Leave" ? "warning" : "neutral"} dot>{e.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700">
              View all {dept.count} members <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {tab === "analytics" && (
          <div className="grid gap-4 p-6 sm:grid-cols-3">
            {[
              { label: "Avg. Productivity", value: "89%", delta: "+5.2%" },
              { label: "Avg. Tenure", value: "2.8 yrs", delta: "+0.4" },
              { label: "Attrition Rate", value: "8.4%", delta: "−2.1%" },
              { label: "Open Positions", value: "2", delta: "actively hiring" },
              { label: "Attendance", value: "94.6%", delta: "+1.2%" },
              { label: "Avg. Salary", value: "₹18.4 LPA", delta: "median" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-slate-200 p-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{s.label}</div>
                <div className="mt-1 font-display text-2xl font-extrabold text-slate-900">{s.value}</div>
                <div className="mt-1 text-[11px] text-emerald-600 font-semibold">{s.delta}</div>
              </div>
            ))}
          </div>
        )}
        {tab === "open" && (
          <div className="p-6 space-y-3">
            {[
              { title: "Senior Full Stack Engineer", type: "Full-time", loc: "Bengaluru", applicants: 18, status: "Active" },
              { title: "Product Designer", type: "Full-time", loc: "Remote", applicants: 9, status: "Screening" },
            ].map((r) => (
              <div key={r.title} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow"><Briefcase className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900">{r.title}</div>
                  <div className="text-[11px] text-slate-500">{r.type} · {r.loc} · {r.applicants} applicants</div>
                </div>
                <Badge variant="indigo">{r.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Department comparison */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Department Comparison" subtitle="Headcount vs performance" />
          <div className="p-4 pt-0 sm:p-6">
            <div className="h-[280px] w-full flex items-center justify-center">
              {employees.length === 0 ? (
                <div className="text-slate-400 text-sm font-semibold">No comparison data available</div>
              ) : (
                <ResponsiveContainer>
                  <BarChart data={processedDepartments.map(d => ({ name: d.name.split(" ")[0], count: d.count, perf: 80 + (d.count % 15) }))}>
                    <CartesianGrid stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="count" fill="#025085" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="perf" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Headcount Share" subtitle="By department" />
          <div className="p-6 pt-2">
            <div className="relative mx-auto h-[200px] w-[200px] flex items-center justify-center">
              {employees.length === 0 ? (
                <div className="text-slate-400 text-xs font-semibold">No data</div>
              ) : (
                <>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={processedDepartments} cx="50%" cy="50%" innerRadius={62} outerRadius={88} paddingAngle={3} dataKey="count">
                        {processedDepartments.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="font-display text-2xl font-extrabold text-slate-900">{employees.length}</div>
                    <div className="text-[11px] font-medium text-slate-500">Total</div>
                  </div>
                </>
              )}
            </div>
            <div className="mt-3 space-y-1.5">
              {processedDepartments.slice(0, 6).map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS[i] }} />
                    <span className="font-medium text-slate-700">{d.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
