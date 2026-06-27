import { tasks as employeesTasks } from "./employees";

export interface TaskComment {
  id: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
}

export interface TaskHistory {
  id: string;
  action: string;
  user: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string; // Employee name
  assigneeAvatar?: string;
  department: string;
  due: string; // YYYY-MM-DD
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "Pending" | "In Progress" | "Review" | "Completed";
  progress: number;
  comments: TaskComment[];
  history: TaskHistory[];
}

const defaultTasks: Task[] = [];

const LOCAL_STORAGE_KEY = "hrms_store_tasks";

export function syncTasksWithEmployeesData(currentStoreTasks: Task[]) {
  // Clear the original tasks array imported from employees.ts
  employeesTasks.length = 0;
  
  // Format matching the original structure for compatibility with Dashboard
  const mapped = currentStoreTasks.map(t => ({
    id: t.id,
    title: t.title,
    assignee: t.assignee,
    department: t.department,
    due: t.due,
    priority: t.priority === "Urgent" ? "High" : t.priority,
    status: t.status === "Pending" ? "To Do" : t.status === "Review" ? "Blocked" : t.status,
    progress: t.progress,
    avatar: t.assigneeAvatar || ""
  }));
  
  employeesTasks.push(...mapped);
}

export function getTasksFromStorage(): Task[] {
  if (typeof window === "undefined") return defaultTasks;
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      syncTasksWithEmployeesData(parsed);
      return parsed;
    } catch (e) {
      console.error("Error parsing tasks, loading defaults", e);
    }
  }
  syncTasksWithEmployeesData(defaultTasks);
  return defaultTasks;
}

export function saveTasksToStorage(tasksList: Task[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasksList));
  syncTasksWithEmployeesData(tasksList);
}
