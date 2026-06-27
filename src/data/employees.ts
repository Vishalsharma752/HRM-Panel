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
const getAvatar = (name: string, bg1: string, bg2: string) => {
  const initials = name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${bg1}"/><stop offset="100%" stop-color="${bg2}"/></linearGradient></defs><rect width="80" height="80" rx="40" fill="url(#g)"/><text x="50%" y="54%" text-anchor="middle" font-family="Inter, sans-serif" font-size="28" font-weight="700" fill="white" dominant-baseline="middle">${initials}</text></svg>`
  )}`;
};

export const employees: Employee[] = [
  {
    id: "EMP-ADMIN",
    empCode: "TISNX-ADMIN",
    name: "System Admin",
    email: "admin@tisnx.com",
    phone: "+91 99999 99999",
    avatar: getAvatar("System Admin", "#4f46e5", "#7c3aed"),
    department: "Management",
    designation: "Administrator",
    role: "Admin",
    status: "Active",
    joinDate: "2024-01-01",
    location: "Remote",
    salary: 2800000,
  },
  {
    id: "EMP-001",
    empCode: "TISNX-001",
    name: "Vikram Iyer",
    email: "vikram@tisnx.com",
    phone: "+91 98765 00001",
    avatar: getAvatar("Vikram Iyer", "#0ea5e9", "#2563eb"),
    department: "Engineering",
    designation: "Engineering Manager",
    role: "Manager",
    status: "Active",
    joinDate: "2024-02-15",
    location: "Bengaluru, IN",
    manager: "System Admin",
    salary: 2400000,
  },
  {
    id: "EMP-002",
    empCode: "TISNX-002",
    name: "Neha Sharma",
    email: "neha@tisnx.com",
    phone: "+91 98765 00002",
    avatar: getAvatar("Neha Sharma", "#ec4899", "#d946ef"),
    department: "HR & People",
    designation: "HR Lead",
    role: "HR" as any,
    status: "Active",
    joinDate: "2024-06-10",
    location: "Noida, IN",
    manager: "System Admin",
    salary: 1200000,
  },
  {
    id: "EMP-003",
    empCode: "TISNX-003",
    name: "Rohan Mehta",
    email: "rohan@tisnx.com",
    phone: "+91 98765 00003",
    avatar: getAvatar("Rohan Mehta", "#10b981", "#059669"),
    department: "Engineering",
    designation: "Senior Software Engineer",
    role: "Employee",
    status: "Active",
    joinDate: "2025-01-20",
    location: "Bengaluru, IN",
    manager: "Vikram Iyer",
    salary: 1800000,
  },
  {
    id: "EMP-004",
    empCode: "TISNX-004",
    name: "Aanya Kapoor",
    email: "aanya@tisnx.com",
    phone: "+91 98765 00004",
    avatar: getAvatar("Aanya Kapoor", "#f59e0b", "#d97706"),
    department: "Design",
    designation: "Product Designer",
    role: "Employee",
    status: "Active",
    joinDate: "2025-03-01",
    location: "Remote",
    manager: "Vikram Iyer",
    salary: 1400000,
  },
  {
    id: "EMP-005",
    empCode: "TISNX-005",
    name: "Karan Bisht",
    email: "karan@tisnx.com",
    phone: "+91 98765 00005",
    avatar: getAvatar("Karan Bisht", "#3b82f6", "#1d4ed8"),
    department: "Finance",
    designation: "Finance Lead",
    role: "Employee",
    status: "Active",
    joinDate: "2024-11-05",
    location: "Mumbai, IN",
    manager: "System Admin",
    salary: 1600000,
  },
  {
    id: "EMP-006",
    empCode: "TISNX-006",
    name: "Simran Kaur",
    email: "simran@tisnx.com",
    phone: "+91 98765 00006",
    avatar: getAvatar("Simran Kaur", "#a855f7", "#7c3aed"),
    department: "Marketing",
    designation: "Social Media Specialist",
    role: "Employee",
    status: "Probation",
    joinDate: "2026-02-01",
    location: "Noida, IN",
    manager: "Neha Sharma",
    salary: 900000,
  }
];

export const attendanceToday = [
  { id: "EMP-001", name: "Vikram Iyer", department: "Engineering", checkIn: "09:15 AM", checkOut: "—", status: "Present", avatar: getAvatar("Vikram Iyer", "#0ea5e9", "#2563eb"), date: "2026-06-27" },
  { id: "EMP-002", name: "Neha Sharma", department: "HR & People", checkIn: "09:30 AM", checkOut: "—", status: "Present", avatar: getAvatar("Neha Sharma", "#ec4899", "#d946ef"), date: "2026-06-27" },
  { id: "EMP-003", name: "Rohan Mehta", department: "Engineering", checkIn: "09:45 AM", checkOut: "—", status: "Present", avatar: getAvatar("Rohan Mehta", "#10b981", "#059669"), date: "2026-06-27" },
  { id: "EMP-004", name: "Aanya Kapoor", department: "Design", checkIn: "10:05 AM", checkOut: "—", status: "Late", avatar: getAvatar("Aanya Kapoor", "#f59e0b", "#d97706"), date: "2026-06-27" },
  { id: "EMP-005", name: "Karan Bisht", department: "Finance", checkIn: "—", checkOut: "—", status: "On Leave", avatar: getAvatar("Karan Bisht", "#3b82f6", "#1d4ed8"), date: "2026-06-27" }
];

export const leaveRequests = [
  { id: "LV-4091", employee: "Karan Bisht", department: "Finance", type: "Casual Leave", from: "2026-06-26", to: "2026-06-28", days: 3, reason: "Attending cousin's wedding", status: "Approved", avatar: getAvatar("Karan Bisht", "#3b82f6", "#1d4ed8") },
  { id: "LV-8812", employee: "Rohan Mehta", department: "Engineering", type: "Sick Leave", from: "2026-07-02", to: "2026-07-03", days: 2, reason: "Severe viral fever, doctor advised rest", status: "Pending", avatar: getAvatar("Rohan Mehta", "#10b981", "#059669") },
  { id: "LV-2287", employee: "Aanya Kapoor", department: "Design", type: "Earned Leave", from: "2026-07-10", to: "2026-07-15", days: 5, reason: "Family vacation to Himachal", status: "Pending", avatar: getAvatar("Aanya Kapoor", "#f59e0b", "#d97706") }
];

export const tasks: any[] = [];

export const notifications = [
  {
    id: "notif_001",
    userId: null,
    role: "all" as const,
    title: "System Update Complete",
    message: "HR Portal has been successfully updated to v2.4. New geofenced check-in rules are now live.",
    type: "system" as const,
    isRead: false,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    pinned: true
  },
  {
    id: "notif_002",
    userId: null,
    role: "Admin" as const,
    title: "New Leave Application",
    message: "Rohan Mehta has applied for 2 days of Sick Leave starting July 2, 2026.",
    type: "leave" as const,
    isRead: false,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: "notif_003",
    userId: null,
    role: "Employee" as const,
    title: "Task Assigned",
    message: "Vikram Iyer assigned you a new task: 'Optimize Dashboard Render Times'. Due in 3 days.",
    type: "task" as const,
    isRead: false,
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: "notif_004",
    userId: null,
    role: "all" as const,
    title: "Townhall Meeting Scheduled",
    message: "Our Q2 Townhall will take place on June 30 at 4:00 PM IST. Join via Google Meet link.",
    type: "announcement" as const,
    isRead: true,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  }
];

export const recentActivities = [
  { id: 101, user: "Rohan Mehta", action: "checked in", target: "for today", time: "2 hours ago", avatar: getAvatar("Rohan Mehta", "#10b981", "#059669") },
  { id: 102, user: "Aanya Kapoor", action: "checked in", target: "for today (Late)", time: "1 hour ago", avatar: getAvatar("Aanya Kapoor", "#f59e0b", "#d97706") },
  { id: 103, user: "System Admin", action: "updated salary structure of", target: "Rohan Mehta", time: "Yesterday", avatar: getAvatar("System Admin", "#4f46e5", "#7c3aed") },
  { id: 104, user: "Neha Sharma", action: "approved leave request for", target: "Karan Bisht", time: "Yesterday", avatar: getAvatar("Neha Sharma", "#ec4899", "#d946ef") }
];

export const leaveBalance: any[] = [];

export const kpiTrend = [
  { month: "Jan", employees: 6, attendance: 94, productivity: 82 },
  { month: "Feb", employees: 6, attendance: 95, productivity: 84 },
  { month: "Mar", employees: 6, attendance: 96, productivity: 88 },
  { month: "Apr", employees: 6, attendance: 93, productivity: 87 },
  { month: "May", employees: 6, attendance: 94, productivity: 90 },
  { month: "Jun", employees: 7, attendance: 96, productivity: 93 },
];

export const attendanceTrend = [
  { day: "Mon", present: 6, leave: 0, absent: 0 },
  { day: "Tue", present: 5, leave: 1, absent: 0 },
  { day: "Wed", present: 6, leave: 0, absent: 0 },
  { day: "Thu", present: 6, leave: 0, absent: 0 },
  { day: "Fri", present: 5, leave: 0, absent: 1 },
  { day: "Sat", present: 4, leave: 2, absent: 0 },
  { day: "Sun", present: 0, leave: 0, absent: 0 },
];

export const departmentDistribution = [
  { name: "Engineering", value: 3, color: "#025085" },
  { name: "HR & People", value: 1, color: "#10b981" },
  { name: "Finance", value: 1, color: "#f59e0b" },
  { name: "Design", value: 1, color: "#a855f7" },
  { name: "Marketing", value: 1, color: "#E81D3B" }
];

export const performanceData = [
  { name: "Engineering", score: 93, target: 85 },
  { name: "Design", score: 95, target: 88 },
  { name: "Finance", score: 89, target: 82 },
  { name: "HR & People", score: 91, target: 80 },
  { name: "Marketing", score: 86, target: 80 }
];

export const onboardingQueue: {
  id: string;
  name: string;
  role: string;
  stage: string;
  startDate: string;
  buddy: string;
  avatar: string;
}[] = [];

export const performanceReviews: {
  id: string;
  employee: string;
  reviewer: string;
  period: string;
  rating: number;
  status: string;
  avatar: string;
}[] = [];
