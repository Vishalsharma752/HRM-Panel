import { useState } from "react";
import {
  Download, FileText, Calendar, TrendingUp, Users,
  FileSpreadsheet, Printer, Share2, Sparkles, Clock, Award, DollarSign, Plus,
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell } from "recharts";
import { PageHeader, Card, CardHeader, Button, Tabs, Select } from "../components/ui";
import { performanceData, departmentDistribution } from "../data/employees";

const COLORS = ["#025085", "#00538C", "#E81D3B", "#10b981", "#f59e0b", "#0ea5e9", "#8b5cf6", "#a855f7"];

const reportTypes = [
  { id: "attendance", label: "Attendance Report", icon: Clock, color: "from-indigo-500 to-violet-600", desc: "Daily/monthly attendance logs" },
  { id: "leave", label: "Leave Report", icon: Calendar, color: "from-emerald-500 to-teal-600", desc: "Leave balances & history" },
  { id: "department", label: "Department Report", icon: Users, color: "from-amber-500 to-orange-600", desc: "Department-wise analytics" },
  { id: "performance", label: "Performance Report", icon: Award, color: "from-rose-500 to-pink-600", desc: "Reviews & ratings" },
  { id: "payroll", label: "Payroll Report", icon: DollarSign, color: "from-sky-500 to-cyan-600", desc: "Compensation & deductions" },
  { id: "headcount", label: "Headcount Report", icon: TrendingUp, color: "from-fuchsia-500 to-purple-600", desc: "Hiring, exits & growth" },
];

const monthly = [
  { m: "Jan", attendance: 92, leave: 5, performance: 4.2, attrition: 2.1 },
  { m: "Feb", attendance: 93, leave: 4, performance: 4.3, attrition: 1.8 },
  { m: "Mar", attendance: 94, leave: 6, performance: 4.4, attrition: 1.5 },
  { m: "Apr", attendance: 92, leave: 5, performance: 4.3, attrition: 2.2 },
  { m: "May", attendance: 91, leave: 7, performance: 4.5, attrition: 1.9 },
  { m: "Jun", attendance: 95, leave: 4, performance: 4.6, attrition: 1.4 },
  { m: "Jul", attendance: 93, leave: 5, performance: 4.4, attrition: 1.7 },
  { m: "Aug", attendance: 92, leave: 6, performance: 4.5, attrition: 1.5 },
  { m: "Sep", attendance: 94, leave: 5, performance: 4.5, attrition: 1.3 },
  { m: "Oct", attendance: 91, leave: 7, performance: 4.6, attrition: 1.6 },
  { m: "Nov", attendance: 95, leave: 4, performance: 4.7, attrition: 1.2 },
  { m: "Dec", attendance: 96, leave: 3, performance: 4.7, attrition: 1.0 },
];

export function Reports() {
  const [tab, setTab] = useState("overview");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Generate, schedule and export HR reports"
        breadcrumb={[{ label: "Home" }, { label: "Insights" }, { label: "Reports" }]}
        actions={
          <>
            <Select className="w-40">
              <option>Last 30 days</option>
              <option>Last quarter</option>
              <option>FY 2024-25</option>
              <option>Custom range</option>
            </Select>
            <Button variant="secondary" size="md" leftIcon={<Share2 className="h-4 w-4" />}>Share</Button>
            <Button variant="gradient" size="md" leftIcon={<Download className="h-4 w-4" />}>Export PDF</Button>
          </>
        }
      />

      {/* AI insight banner */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-5">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-200 to-violet-200 opacity-50 blur-2xl" />
        <div className="relative flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-display text-sm font-extrabold text-slate-900">AI-Powered Insights</div>
            <p className="mt-0.5 text-sm text-slate-600">Your Engineering team's productivity has grown <span className="font-bold text-emerald-600">+12.4%</span> this quarter. Q1 attrition is at a 3-year low. Consider promoting top performers and expanding hiring.</p>
            <div className="mt-3 flex gap-2">
              <Button variant="primary" size="sm">View detailed analysis</Button>
              <Button variant="ghost" size="sm">Dismiss</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Report types */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {reportTypes.map(r => (
          <button key={r.id} onClick={() => setTab(r.id)} className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${tab === r.id ? "border-indigo-300 bg-white shadow-lg shadow-indigo-500/10" : "border-slate-200 bg-white hover:border-slate-300"}`}>
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow ${r.color}`}>
              <r.icon className="h-4 w-4" />
            </div>
            <div className="mt-3 text-sm font-bold text-slate-900">{r.label}</div>
            <div className="mt-0.5 text-[11px] text-slate-500">{r.desc}</div>
          </button>
        ))}
      </div>

      <Card className="p-4">
        <Tabs value={tab} onChange={setTab} items={[
          { value: "overview", label: "Overview" },
          { value: "attendance", label: "Attendance" },
          { value: "leave", label: "Leave" },
          { value: "department", label: "Department" },
          { value: "performance", label: "Performance" },
        ]} />
      </Card>

      {/* Big chart */}
      <Card>
        <CardHeader
          title="Yearly HR Metrics"
          subtitle="Attendance, leave, performance & attrition — 2024"
          action={
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" leftIcon={<FileSpreadsheet className="h-3.5 w-3.5" />}>Excel</Button>
              <Button variant="secondary" size="sm" leftIcon={<Printer className="h-3.5 w-3.5" />}>Print</Button>
            </div>
          }
        />
        <div className="p-4 pt-0 sm:p-6">
          <div className="h-[320px] w-full">
            <ResponsiveContainer>
              <LineChart data={monthly}>
                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="m" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
                <Line type="monotone" dataKey="attendance" stroke="#025085" strokeWidth={2.5} dot={{ r: 4 }} name="Attendance %" />
                <Line type="monotone" dataKey="performance" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} name="Performance" />
                <Line type="monotone" dataKey="leave" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} name="Leave %" />
                <Line type="monotone" dataKey="attrition" stroke="#E81D3B" strokeWidth={2.5} dot={{ r: 4 }} name="Attrition %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      {/* Sub charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Department Performance Index" subtitle="Score vs target" />
          <div className="p-4 pt-0 sm:p-6">
            <div className="h-[260px] w-full">
              <ResponsiveContainer>
                <BarChart data={performanceData} layout="vertical">
                  <CartesianGrid stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={110} />
                  <Tooltip contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="score" fill="url(#bgRad)" radius={[0, 6, 6, 0]} />
                  <defs>
                    <linearGradient id="bgRad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#025085" />
                      <stop offset="100%" stopColor="#00538C" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Headcount Distribution" subtitle="By department — current" />
          <div className="p-4 pt-0 sm:p-6">
            <div className="flex items-center gap-6">
              <div className="relative h-[220px] w-[220px] shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={departmentDistribution} cx="50%" cy="50%" innerRadius={62} outerRadius={92} paddingAngle={3} dataKey="value">
                      {departmentDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="font-display text-2xl font-extrabold text-slate-900">152</div>
                  <div className="text-[11px] font-medium text-slate-500">Employees</div>
                </div>
              </div>
              <div className="flex-1 space-y-1.5">
                {departmentDistribution.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} />
                      <span className="font-medium text-slate-700">{d.name}</span>
                    </div>
                    <span className="font-bold text-slate-900">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent reports */}
      <Card>
        <CardHeader title="Recently Generated Reports" subtitle="Download or share with stakeholders" action={<Button variant="secondary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>Schedule Report</Button>} />
        <div className="divide-y divide-slate-100">
          {[
            { name: "Q4 2024 Attendance Summary", type: "PDF", size: "2.4 MB", date: "12 Jan 2025", by: "Kashif Nawaz" },
            { name: "December 2024 Payroll Report", type: "Excel", size: "812 KB", date: "05 Jan 2025", by: "Rohit Verma" },
            { name: "Annual Performance Review 2024", type: "PDF", size: "5.6 MB", date: "31 Dec 2024", by: "Kashif Nawaz" },
            { name: "Engineering Team Productivity Q4", type: "PDF", size: "1.8 MB", date: "28 Dec 2024", by: "Vikram Iyer" },
            { name: "Headcount & Attrition Analysis", type: "Excel", size: "1.2 MB", date: "20 Dec 2024", by: "Navdeep Sharma" },
          ].map(r => (
            <div key={r.name} className="flex items-center gap-3 px-6 py-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-900">{r.name}</div>
                <div className="text-[11px] text-slate-500">{r.type} · {r.size} · Generated {r.date} by {r.by}</div>
              </div>
              <Button variant="ghost" size="sm" leftIcon={<Share2 className="h-3.5 w-3.5" />}>Share</Button>
              <Button variant="secondary" size="sm" leftIcon={<Download className="h-3.5 w-3.5" />}>Download</Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
