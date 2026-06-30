export type Employee = {
  id: string;
  empCode: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  department: string;
  designation: string;
  role: "Admin" | "HR" | "Manager" | "Employee";
  status: "Active" | "On Leave" | "Inactive" | "Probation";
  joinDate: string;
  location: string;
  manager?: string;
  salary?: number;
  user_id?: string;
};

export const departments = [
  { name: "Engineering", count: 0, head: "—", color: "from-indigo-500 to-violet-600", icon: "Code2" },
  { name: "Sales & BD", count: 0, head: "—", color: "from-emerald-500 to-teal-600", icon: "TrendingUp" },
  { name: "Marketing", count: 0, head: "—", color: "from-pink-500 to-rose-600", icon: "Megaphone" },
  { name: "HR & People", count: 0, head: "—", color: "from-amber-500 to-orange-600", icon: "Users" },
  { name: "Finance", count: 0, head: "—", color: "from-cyan-500 to-blue-600", icon: "Banknote" },
  { name: "Operations", count: 0, head: "—", color: "from-fuchsia-500 to-purple-600", icon: "Settings" },
  { name: "Customer Success", count: 0, head: "—", color: "from-sky-500 to-indigo-600", icon: "Headphones" },
  { name: "Design", count: 0, head: "—", color: "from-rose-500 to-pink-600", icon: "Palette" },
];

// Helper to generate initials avatar
export const getAvatar = (name: string, bg1: string, bg2: string) => {
  const initials = name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${bg1}"/><stop offset="100%" stop-color="${bg2}"/></linearGradient></defs><rect width="80" height="80" rx="40" fill="url(#g)"/><text x="50%" y="54%" text-anchor="middle" font-family="Inter, sans-serif" font-size="28" font-weight="700" fill="white" dominant-baseline="middle">${initials}</text></svg>`
  )}`;
};

export const employees: Employee[] = [];

export const attendanceToday: any[] = [];

export const leaveRequests: any[] = [];

export const tasks: any[] = [];

export const notifications: any[] = [];

export const recentActivities: any[] = [];

export const leaveBalance: any[] = [];

export const kpiTrend: any[] = [];

export const attendanceTrend: any[] = [];

export const departmentDistribution: any[] = [];

export const performanceData: any[] = [];

export const onboardingQueue: any[] = [];

export const performanceReviews: any[] = [];
