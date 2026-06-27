import { useState, useMemo, useEffect } from "react";
import {
  Plus, Search, Calendar, ListTodo, Clock, CheckCircle2, AlertCircle,
  MessageSquare, Edit, Trash2, X, Send, History
} from "lucide-react";
import { PageHeader, Card, CardHeader, Button, Badge, Avatar, Input, Tabs, Progress, Select, ConfirmModal } from "../components/ui";
import { useStore, SyncedEmployee } from "../data/store";
import {
  type Task,
  type TaskComment,
  type TaskHistory
} from "../data/tasksStore";

const statusMeta: Record<string, { variant: "neutral" | "indigo" | "warning" | "success"; label: string; bg: string }> = {
  "Pending": { variant: "neutral", label: "Pending", bg: "bg-slate-400" },
  "In Progress": { variant: "indigo", label: "In Progress", bg: "bg-indigo-500" },
  "Review": { variant: "warning", label: "Review", bg: "bg-amber-500" },
  "Completed": { variant: "success", label: "Completed", bg: "bg-emerald-500" }
};

const priorityMeta: Record<string, { variant: "neutral" | "warning" | "danger"; label: string }> = {
  "Low": { variant: "neutral", label: "Low" },
  "Medium": { variant: "warning", label: "Medium" },
  "High": { variant: "danger", label: "High" },
  "Urgent": { variant: "danger", label: "Urgent" }
};

const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const mockToday = getLocalDateString(); // Setup dynamic date for overdue calculations

export function Tasks({ currentUser, search, setSearch }: { currentUser: SyncedEmployee; search?: string; setSearch?: (s: string) => void }) {
  const [tasks, setTasks] = useStore<Task[]>("tasks", []);
  const [employees] = useStore<SyncedEmployee[]>("employees", []);

  const sortedEmployees = useMemo(() => {
    const list = [...employees];
    list.sort((a, b) => {
      const aName = (a.name || "").toLowerCase();
      const bName = (b.name || "").toLowerCase();

      const isANavdeep = aName.includes("navdeep") && aName.includes("sharma");
      const isBNavdeep = bName.includes("navdeep") && bName.includes("sharma");

      const isAKashif = aName.includes("kashif") && aName.includes("nawaz");
      const isBKashif = bName.includes("kashif") && bName.includes("nawaz");

      if (isANavdeep && isBNavdeep) return 0;
      if (isANavdeep) return -1;
      if (isBNavdeep) return 1;

      if (isAKashif && isBKashif) return 0;
      if (isAKashif) return -1;
      if (isBKashif) return 1;

      return 0;
    });
    return list;
  }, [employees]);

  const [view, setView] = useState<"list" | "kanban">("kanban");
  const [tab, setTab] = useState("all");
  const [localSearch, setLocalSearch] = useState("");
  const searchVal = search !== undefined ? search : localSearch;
  const onSearchChange = setSearch !== undefined ? setSearch : setLocalSearch;

  // Immediate input state
  const [inputValue, setInputValue] = useState(searchVal);

  // Debounced search state used for actual list filtering
  const [debouncedSearch, setDebouncedSearch] = useState(searchVal);

  // Sync input value with searchVal from parent/navigation
  useEffect(() => {
    setInputValue(searchVal);
  }, [searchVal]);

  // Debounce the state update of both the internal filter and the parent state
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(inputValue);
      if (inputValue !== searchVal) {
        onSearchChange(inputValue);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [inputValue, onSearchChange, searchVal]);

  const [selectedPriority, setSelectedPriority] = useState("All");

  // Modals state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formAssigneeId, setFormAssigneeId] = useState("");
  const [formPriority, setFormPriority] = useState<Task["priority"]>("Medium");
  const [formDue, setFormDue] = useState("");
  const [formStatus, setFormStatus] = useState<Task["status"]>("Pending");

  // Comment state
  const [newCommentText, setNewCommentText] = useState("");

  // Confirm Delete Modal State
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedPriority, tab]);

  // Comment Editing States
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  // Role Checker
  const isAdmin = currentUser.role === "Admin" || currentUser.role === "Founder" || currentUser.role === "Cofounder";

  // --- Handlers & Store Sync ---
  const updateTasksState = (updatedList: Task[]) => {
    setTasks(updatedList);
    // If the currently viewed task was updated, refresh details
    if (selectedTask) {
      const refreshed = updatedList.find(t => t.id === selectedTask.id);
      setSelectedTask(refreshed || null);
    }
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formAssigneeId || !formDue) return;

    const assignedEmployee = employees.find(emp => emp.id === formAssigneeId);
    if (!assignedEmployee) return;

    // Generate unique ID
    const matchIds = tasks.map(t => {
      const parts = t.id.split("-");
      return parts.length > 1 ? parseInt(parts[1]) : 200;
    }).filter(num => !isNaN(num));
    const nextNum = matchIds.length > 0 ? Math.max(...matchIds, 200) + 1 : 201;
    const newId = `TSK-${nextNum}`;

    const newTask: Task = {
      id: newId,
      title: formTitle,
      description: formDesc,
      assignee: assignedEmployee.name,
      assigneeAvatar: assignedEmployee.avatar,
      department: assignedEmployee.department,
      due: formDue,
      priority: formPriority,
      status: formStatus,
      progress: formStatus === "Completed" ? 100 : 0,
      comments: [],
      history: [
        {
          id: `h_init_${Date.now()}`,
          action: `Created task "${formTitle}"`,
          user: currentUser.name,
          createdAt: new Date().toISOString()
        },
        {
          id: `h_assign_${Date.now()}`,
          action: `Assigned task to ${assignedEmployee.name}`,
          user: currentUser.name,
          createdAt: new Date().toISOString()
        }
      ]
    };

    updateTasksState([newTask, ...tasks]);
    resetForm();
    setShowCreate(false);
  };

  const handleEditTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !formTitle.trim() || !formAssigneeId || !formDue) return;

    const assignedEmployee = employees.find(emp => emp.id === formAssigneeId);
    if (!assignedEmployee) return;

    const updatedTasks = tasks.map(t => {
      if (t.id === editingTask.id) {
        const changes: string[] = [];
        if (t.title !== formTitle) changes.push(`renamed title`);
        if (t.assignee !== assignedEmployee.name) changes.push(`reassigned to ${assignedEmployee.name}`);
        if (t.priority !== formPriority) changes.push(`changed priority to ${formPriority}`);
        if (t.due !== formDue) changes.push(`extended due date to ${formDue}`);
        if (t.status !== formStatus) changes.push(`changed status to ${formStatus}`);

        const historyLogs = [...t.history];
        if (changes.length > 0) {
          historyLogs.push({
            id: `h_edit_${Date.now()}`,
            action: `Modified task: ${changes.join(", ")}`,
            user: currentUser.name,
            createdAt: new Date().toISOString()
          });
        }

        return {
          ...t,
          title: formTitle,
          description: formDesc,
          assignee: assignedEmployee.name,
          assigneeAvatar: assignedEmployee.avatar,
          department: assignedEmployee.department,
          due: formDue,
          priority: formPriority,
          status: formStatus,
          progress: formStatus === "Completed" ? 100 : t.progress,
          history: historyLogs
        };
      }
      return t;
    });

    updateTasksState(updatedTasks);
    resetForm();
    setEditingTask(null);
  };

  const handleDeleteTask = (taskId: string) => {
    setDeletingTaskId(taskId);
  };

  const confirmDeleteTask = () => {
    if (!deletingTaskId) return;
    const updated = tasks.filter(t => t.id !== deletingTaskId);
    updateTasksState(updated);
    if (selectedTask?.id === deletingTaskId) {
      setSelectedTask(null);
    }
    setDeletingTaskId(null);
  };

  const handleDeleteComment = (taskId: string, commentId: string) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          comments: t.comments.filter(c => c.id !== commentId),
          history: [
            ...t.history,
            {
              id: `h_comm_del_${Date.now()}`,
              action: `Deleted a comment`,
              user: currentUser.name,
              createdAt: new Date().toISOString()
            }
          ]
        };
      }
      return t;
    });
    updateTasksState(updated);
  };

  const handleSaveEditedComment = (taskId: string, commentId: string, content: string) => {
    if (!content.trim()) return;
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          comments: t.comments.map(c => c.id === commentId ? { ...c, content: content.trim() } : c),
          history: [
            ...t.history,
            {
              id: `h_comm_edit_${Date.now()}`,
              action: `Edited a comment`,
              user: currentUser.name,
              createdAt: new Date().toISOString()
            }
          ]
        };
      }
      return t;
    });
    updateTasksState(updated);
    setEditingCommentId(null);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newCommentText.trim()) return;

    const comment: TaskComment = {
      id: `c_${Date.now()}`,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      content: newCommentText.trim(),
      createdAt: new Date().toISOString()
    };

    const historyLog: TaskHistory = {
      id: `h_comm_${Date.now()}`,
      action: `Added comment: "${newCommentText.substring(0, 30)}${newCommentText.length > 30 ? "..." : ""}"`,
      user: currentUser.name,
      createdAt: new Date().toISOString()
    };

    const updated = tasks.map(t => {
      if (t.id === selectedTask.id) {
        return {
          ...t,
          comments: [...t.comments, comment],
          history: [...t.history, historyLog]
        };
      }
      return t;
    });

    updateTasksState(updated);
    setNewCommentText("");
  };

  const handleUpdateStatusAndProgress = (taskId: string, newStatus: Task["status"], newProgress: number) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        const changes: string[] = [];
        let finalStatus = newStatus;
        let finalProgress = newProgress;

        // Auto-alignment between progress and status
        if (newStatus === "Completed" && t.status !== "Completed") {
          finalProgress = 100;
          changes.push(`marked completed`);
        } else if (newProgress === 100 && t.progress !== 100) {
          finalStatus = "Completed";
          changes.push(`marked completed (100% progress)`);
        } else {
          if (t.status !== newStatus) changes.push(`updated status to ${newStatus}`);
          if (t.progress !== newProgress) changes.push(`updated progress to ${newProgress}%`);
        }

        const newLogs = [...t.history];
        if (changes.length > 0) {
          newLogs.push({
            id: `h_prog_${Date.now()}`,
            action: changes.join(", "),
            user: currentUser.name,
            createdAt: new Date().toISOString()
          });
        }

        return {
          ...t,
          status: finalStatus,
          progress: finalProgress,
          history: newLogs
        };
      }
      return t;
    });

    updateTasksState(updated);
  };

  const resetForm = () => {
    setFormTitle("");
    setFormDesc("");
    setFormAssigneeId("");
    setFormPriority("Medium");
    setFormDue("");
    setFormStatus("Pending");
  };

  const openCreateModal = () => {
    resetForm();
    if (employees.length > 0) {
      setFormAssigneeId(employees[0].id);
    }
    setShowCreate(true);
  };

  const openEditModal = (task: Task) => {
    const matchedEmp = employees.find(e => e.name === task.assignee);
    setFormTitle(task.title);
    setFormDesc(task.description);
    setFormAssigneeId(matchedEmp ? matchedEmp.id : "");
    setFormPriority(task.priority);
    setFormDue(task.due);
    setFormStatus(task.status);
    setEditingTask(task);
  };

  // --- Filtering ---
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      // If Employee, strictly only see tasks assigned to them!
      if (currentUser.role === "Employee" && t.assignee !== currentUser.name) {
        return false;
      }

      // Search filter
      const textMatch = !debouncedSearch ||
        t.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        t.id.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
        t.assignee.toLowerCase().includes(debouncedSearch.toLowerCase());
      if (!textMatch) return false;

      // Priority filter
      if (selectedPriority !== "All" && t.priority !== selectedPriority) return false;

      // Tab filters
      if (isAdmin) {
        if (tab === "mine") {
          if (t.assignee !== currentUser.name) return false;
        } else if (tab === "team") {
          if (t.department !== currentUser.department) return false;
        }
      }

      return true;
    });
  }, [tasks, debouncedSearch, selectedPriority, tab, currentUser]);

  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTasks.slice(start, start + itemsPerPage);
  }, [filteredTasks, currentPage]);

  // --- Metrics Computation ---
  const stats = useMemo(() => {
    const activeTasksList = currentUser.role === "Employee" ? tasks.filter(t => t.assignee === currentUser.name) : tasks;
    const total = activeTasksList.length;
    const completed = activeTasksList.filter(t => t.status === "Completed").length;
    const pending = activeTasksList.filter(t => t.status !== "Completed").length;
    const overdue = activeTasksList.filter(t => t.status !== "Completed" && t.due < mockToday).length;

    return { total, pending, completed, overdue };
  }, [tasks, currentUser]);

  // Compile history logs from all tasks for recent activities
  const recentActivities = useMemo(() => {
    const allActivities: { id: string; user: string; action: string; taskTitle: string; taskId: string; time: string; avatar?: string }[] = [];
    tasks.forEach(t => {
      t.history.forEach(h => {
        allActivities.push({
          id: h.id,
          user: h.user,
          action: h.action,
          taskTitle: t.title,
          taskId: t.id,
          time: new Date(h.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
          avatar: employees.find(e => e.name === h.user)?.avatar
        });
      });
    });
    return allActivities.sort((a, b) => b.id.localeCompare(a.id)).slice(0, 5);
  }, [tasks, employees]);

  // Grouped tasks for Kanban view
  const kanbanGrouped = useMemo(() => {
    return {
      "Pending": filteredTasks.filter(t => t.status === "Pending"),
      "In Progress": filteredTasks.filter(t => t.status === "In Progress"),
      "Review": filteredTasks.filter(t => t.status === "Review"),
      "Completed": filteredTasks.filter(t => t.status === "Completed")
    };
  }, [filteredTasks]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Task Management"
        subtitle={`Assign, monitor and deliver team operations. Welcome back, ${currentUser.name}.`}
        breadcrumb={[{ label: "Home" }, { label: "Operations" }, { label: "Tasks" }]}
        actions={
          <>
            <Tabs value={view} onChange={(v) => setView(v as any)} items={[
              { value: "kanban", label: "Kanban Board" },
              { value: "list", label: "List Table" },
            ]} />
            {isAdmin && (
              <Button variant="gradient" size="md" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
                New Task
              </Button>
            )}
          </>
        }
      />

      {/* Metrics Strips */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Total Tasks", value: stats.total, icon: ListTodo, color: "from-indigo-500 to-violet-600" },
          { label: "Pending Tasks", value: stats.pending, icon: Clock, color: "from-amber-500 to-orange-600" },
          { label: "Completed Tasks", value: stats.completed, icon: CheckCircle2, color: "from-emerald-500 to-teal-600" },
          { label: "Overdue Tasks", value: stats.overdue, icon: AlertCircle, color: "from-rose-500 to-pink-600" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all hover:shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{s.label}</span>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow ${s.color}`}>
                <s.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 font-display text-3xl font-extrabold text-slate-900">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search and Filters Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <Tabs value={tab} onChange={setTab} items={
              isAdmin ? [
                { value: "all", label: "All Tasks", count: tasks.length },
                { value: "mine", label: "Assigned to me", count: tasks.filter(t => t.assignee === currentUser.name).length },
                { value: "team", label: "My Department", count: tasks.filter(t => t.department === currentUser.department).length },
              ] : [
                { value: "all", label: "My Tasks", count: tasks.filter(t => t.assignee === currentUser.name).length }
              ]
            } />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-56">
              <Input
                placeholder="Search by ID, name, assignee…"
                leftIcon={<Search className="h-4 w-4" />}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            </div>
            <Select
              className="w-36"
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
            >
              <option value="All">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Kanban Board View */}
      {view === "kanban" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(kanbanGrouped).map(([statusName, list]) => (
            <div key={statusName} className="flex flex-col rounded-2xl bg-slate-100/60 p-3">
              <div className="mb-3 flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${statusMeta[statusName].bg}`} />
                  <span className="text-sm font-bold text-slate-900">{statusName}</span>
                  <Badge variant={statusMeta[statusName].variant}>{list.length}</Badge>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => {
                      openCreateModal();
                      setFormStatus(statusName as Task["status"]);
                    }}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {list.map(t => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTask(t)}
                    className="group rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:shadow-md hover:border-indigo-200 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t.id}</div>
                      <Badge variant={priorityMeta[t.priority].variant} className="text-[9px]">
                        {t.priority}
                      </Badge>
                    </div>

                    <div className="mt-1.5 text-sm font-bold text-slate-900 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                      {t.title}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                      <Badge variant="indigo" className="px-1.5 py-0">
                        {t.department}
                      </Badge>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {t.due}
                      </span>
                    </div>

                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5">
                      <div className="flex items-center gap-1.5">
                        <Avatar src={t.assigneeAvatar} name={t.assignee} size={22} />
                        <span className="text-[11px] font-semibold text-slate-600">{t.assignee.split(" ")[0]}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400">
                        {t.comments.length > 0 && (
                          <span className="flex items-center gap-0.5">
                            <MessageSquare className="h-3 w-3" /> {t.comments.length}
                          </span>
                        )}
                        <span className="flex items-center gap-0.5">
                          <History className="h-3 w-3" /> {t.history.length}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center gap-2">
                      <Progress value={t.progress} tone={t.status === "Completed" ? "emerald" : "indigo"} />
                      <span className="text-[10px] font-bold text-slate-500">{t.progress}%</span>
                    </div>
                  </div>
                ))}

                {list.length === 0 && (
                  <div className="rounded-xl border-2 border-dashed border-slate-200/80 bg-white/40 py-8 px-4 text-center text-xs text-slate-400 font-medium">
                    No tasks in {statusName}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View (Table Mode) */
        <Card>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3.5">Task ID</th>
                  <th className="px-6 py-3.5">Task Name</th>
                  <th className="px-6 py-3.5">Assigned Employee</th>
                  <th className="px-6 py-3.5">Priority</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Due Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedTasks.map(t => (
                  <tr key={t.id} className="transition-all duration-200 hover:bg-gray-50">
                    <td className="px-6 py-3.5 font-bold text-xs text-slate-400">{t.id}</td>
                    <td className="px-6 py-3.5">
                      <button
                        onClick={() => setSelectedTask(t)}
                        className="text-left font-bold text-slate-900 hover:text-indigo-600 transition-colors"
                      >
                        {t.title}
                      </button>
                      <div className="mt-0.5 text-[11px] text-slate-500 line-clamp-1 max-w-xs">{t.description}</div>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <Avatar src={t.assigneeAvatar} name={t.assignee} size={26} />
                        <span className="text-sm font-semibold text-slate-700">{t.assignee}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge variant={priorityMeta[t.priority].variant}>
                        {t.priority}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge variant={statusMeta[t.status].variant} dot>
                        {t.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-xs font-semibold text-slate-500">{t.due}</td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTask(t)}
                          className="px-2"
                        >
                          View
                        </Button>
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(t);
                              }}
                              className="px-2 text-indigo-600 hover:bg-indigo-50"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(t.id);
                              }}
                              className="px-2 text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTasks.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400 font-medium bg-slate-50/20">
                      No tasks found matching current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredTasks.length > itemsPerPage && (
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4">
              <div className="text-xs text-slate-500">
                Showing <span className="font-semibold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                <span className="font-semibold text-slate-700">
                  {Math.min(currentPage * itemsPerPage, filteredTasks.length)}
                </span>{" "}
                of <span className="font-semibold text-slate-700">{filteredTasks.length}</span> tasks
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage * itemsPerPage >= filteredTasks.length}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Analytics & Activity logs feed */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Department Distribution / Progress */}
        <Card className="lg:col-span-2">
          <CardHeader title="Task Analytics" subtitle="Completion progress by department" />
          <div className="p-6 pt-2 space-y-4">
            {[
              { name: "Engineering", color: "from-indigo-500 to-violet-500" },
              { name: "Design", color: "from-rose-500 to-pink-500" },
              { name: "Marketing", color: "from-emerald-500 to-teal-500" },
              { name: "HR & People", color: "from-amber-500 to-orange-500" },
              { name: "Finance", color: "from-sky-500 to-cyan-500" },
            ].map(d => {
              const deptTasks = tasks.filter(t => t.department === d.name);
              const completed = deptTasks.filter(t => t.status === "Completed").length;
              const pct = deptTasks.length > 0 ? Math.round((completed / deptTasks.length) * 100) : 0;
              return (
                <div key={d.name}>
                  <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700">{d.name}</span>
                    <span className="text-slate-900">{completed} / {deptTasks.length} ({pct}%)</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/10">
                    <div className={`h-full rounded-full bg-gradient-to-r ${d.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Right: Recent activity logs */}
        <Card>
          <CardHeader title="Recent Task Activity" subtitle="Real-time log audit trail" />
          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[300px] scrollbar-thin">
            {recentActivities.map(act => (
              <div key={act.id} className="flex gap-2.5 p-4 items-start text-xs transition-colors hover:bg-slate-50/50">
                <Avatar name={act.user} src={act.avatar} size={28} />
                <div className="flex-1 min-w-0">
                  <div className="text-slate-900 font-bold leading-tight">{act.user}</div>
                  <div className="text-slate-600 mt-0.5 leading-snug">
                    {act.action} on <span className="font-semibold text-indigo-600 hover:underline">{act.taskId}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-medium">{act.time}</div>
                </div>
              </div>
            ))}
            {recentActivities.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400 font-medium">
                No activity recorded yet.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* --- MODAL DIALOGS --- */}

      {/* 1. Create/Edit Task Dialog */}
      {(showCreate || editingTask) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => { setShowCreate(false); setEditingTask(null); }} />
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-extrabold">{editingTask ? "Modify Task Details" : "Assign New Operational Task"}</h2>
                  <p className="text-xs text-indigo-100/80">{editingTask ? `Updating ${editingTask.id}` : "Publish a request to team boards"}</p>
                </div>
                <button
                  onClick={() => { setShowCreate(false); setEditingTask(null); }}
                  className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={editingTask ? handleEditTask : handleCreateTask} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto scrollbar-thin">
              <Input
                label="Task Name"
                placeholder="e.g. Redesign homepage dashboard UI"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  className="min-h-[100px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                  placeholder="Detail guidelines, templates links and expectations…"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Assigned Employee"
                  value={formAssigneeId}
                  onChange={(e) => setFormAssigneeId(e.target.value)}
                  required
                >
                  {sortedEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.department})
                    </option>
                  ))}
                </Select>

                <Select
                  label="Priority Level"
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value as any)}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Due Date"
                  type="date"
                  leftIcon={<Calendar className="h-4 w-4" />}
                  value={formDue}
                  onChange={(e) => setFormDue(e.target.value)}
                  required
                />

                <Select
                  label="Initial Status"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Review">Review</option>
                  <option value="Completed">Completed</option>
                </Select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { setShowCreate(false); setEditingTask(null); }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="gradient">
                  {editingTask ? "Save Changes" : "Create & Assign"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Task Details Drawer (Comments & Activity Audit log) */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-end p-0">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedTask(null)} />
          <div className="relative h-full w-full max-w-xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="border-b border-slate-100 px-6 py-4 bg-slate-50/50 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{selectedTask.id}</span>
                <h2 className="font-display text-base font-extrabold text-slate-900">{selectedTask.title}</h2>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable details */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              {/* Task Meta details */}
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-100 p-4 bg-slate-50/20">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assignee</div>
                  <div className="mt-1 flex items-center gap-2">
                    <Avatar src={selectedTask.assigneeAvatar} name={selectedTask.assignee} size={24} />
                    <span className="text-xs font-bold text-slate-800">{selectedTask.assignee}</span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department</div>
                  <div className="mt-1.5">
                    <Badge variant="indigo">{selectedTask.department}</Badge>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Due Date</div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>{selectedTask.due}</span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Priority</div>
                  <div className="mt-1.5">
                    <Badge variant={priorityMeta[selectedTask.priority].variant}>
                      {selectedTask.priority}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description Guidelines</h3>
                <div className="text-sm text-slate-700 leading-relaxed bg-slate-50/40 p-4 rounded-xl border border-slate-100 whitespace-pre-line">
                  {selectedTask.description || "No descriptions detailed for this assignment."}
                </div>
              </div>

              {/* Status & Progress slider (Interactive for Assignee / Admin) */}
              <div className="space-y-3.5 border-t border-b border-slate-100 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Task Progress</h3>
                  <Badge variant={statusMeta[selectedTask.status].variant} dot>
                    {selectedTask.status}
                  </Badge>
                </div>

                {/* Progress control */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={selectedTask.progress}
                      onChange={(e) => {
                        const nextProg = parseInt(e.target.value);
                        let nextStat = selectedTask.status;
                        if (nextProg === 100) nextStat = "Completed";
                        else if (selectedTask.status === "Completed") nextStat = "In Progress";
                        handleUpdateStatusAndProgress(selectedTask.id, nextStat, nextProg);
                      }}
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-100 accent-indigo-600 focus:outline-none"
                    />
                    <span className="text-xs font-extrabold text-slate-700 w-8 text-right">{selectedTask.progress}%</span>
                  </div>
                </div>

                {/* Status select options */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500">Quick Status Update:</span>
                  <select
                    value={selectedTask.status}
                    onChange={(e) => {
                      const nextStat = e.target.value as Task["status"];
                      const nextProg = nextStat === "Completed" ? 100 : selectedTask.progress;
                      handleUpdateStatusAndProgress(selectedTask.id, nextStat, nextProg);
                    }}
                    className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Review">Review</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Timeline History log */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Activity timeline history</h3>
                <div className="relative border-l border-slate-200 pl-4 ml-1.5 space-y-4">
                  {selectedTask.history.map(hist => (
                    <div key={hist.id} className="relative text-xs">
                      {/* Timeline dot */}
                      <span className="absolute -left-[20.5px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-400" />
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold text-slate-900">{hist.user}</span>{" "}
                          <span className="text-slate-600">{hist.action}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold shrink-0">
                          {new Date(hist.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comments Log */}
              <div className="space-y-4 border-t border-slate-100 pt-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Comments Feed ({selectedTask.comments.length})</h3>

                <div className="space-y-3">
                  {selectedTask.comments.map(c => {
                    const isAuthorOrAdmin = c.authorName === currentUser.name || isAdmin;
                    const isEditing = editingCommentId === c.id;

                    return (
                      <div key={c.id} className="group flex gap-3 rounded-xl border border-slate-100 bg-slate-50/30 p-3 items-start">
                        <Avatar name={c.authorName} src={c.authorAvatar} size={28} />
                        <div className="flex-1 min-w-0 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">{c.authorName}</span>
                              {c.authorName === currentUser.name && (
                                <Badge variant="neutral" className="text-[9px] py-0 px-1">You</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400 font-semibold">
                                {new Date(c.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </span>
                              {!isEditing && isAuthorOrAdmin && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingCommentId(c.id);
                                      setEditingCommentText(c.content);
                                    }}
                                    className="p-0.5 text-slate-400 hover:text-indigo-600 transition-colors"
                                    title="Edit comment"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteComment(selectedTask.id, c.id)}
                                    className="p-0.5 text-slate-400 hover:text-rose-600 transition-colors"
                                    title="Delete comment"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {isEditing ? (
                            <div className="mt-2 space-y-2">
                              <textarea
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value)}
                                className="w-full min-h-[50px] rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required
                              />
                              <div className="flex justify-end gap-1.5">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  className="h-7 text-[10px] px-2.5"
                                  onClick={() => setEditingCommentId(null)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="button"
                                  variant="primary"
                                  size="sm"
                                  className="h-7 text-[10px] px-2.5"
                                  onClick={() => handleSaveEditedComment(selectedTask.id, c.id, editingCommentText)}
                                >
                                  Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-1 text-slate-700 whitespace-pre-line leading-normal">{c.content}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Comment footer textbox */}
            <div className="border-t border-slate-100 p-4 bg-slate-50/50">
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Post an update or comment…"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all shadow-sm"
                  required
                />
                <Button type="submit" variant="gradient" size="md" className="h-10 px-3 shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Task Modal */}
      <ConfirmModal
        isOpen={deletingTaskId !== null}
        title="Delete Task"
        message={`Are you sure you want to permanently delete task ${deletingTaskId}? All associated comments and timeline history logs will be removed.`}
        confirmLabel="Delete Task"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDeleteTask}
        onCancel={() => setDeletingTaskId(null)}
      />
    </div>
  );
}
