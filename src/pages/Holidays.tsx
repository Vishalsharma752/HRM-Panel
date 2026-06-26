import { useState, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Edit, X, Info, HelpCircle
} from "lucide-react";
import { PageHeader, Card, CardHeader, Button, Badge, Input, Select, Textarea, ConfirmModal } from "../components/ui";
import { useStore, SyncedEmployee, Holiday, ActivityRecord } from "../data/store";

export function Holidays({ currentUser }: { currentUser: SyncedEmployee }) {
  const [holidays, setHolidays] = useStore<Holiday[]>("holidays", []);
  const [, setActivities] = useStore<ActivityRecord[]>("activities", []);

  const [activeTab, setActiveTab] = useState<"calendar" | "list">("calendar");
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date("2026-06-01")); // seeded data is mostly in 2026, let's default to 2026-06
  
  // Modals state
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [deletingHoliday, setDeletingHoliday] = useState<{ id: string; title: string } | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formType, setFormType] = useState<Holiday["type"]>("National");
  const [formDesc, setFormDesc] = useState("");
  const [formError, setFormError] = useState("");

  // Bulk Form state
  const [bulkRows, setBulkRows] = useState<Omit<Holiday, "id">[]>([
    { title: "", date: "", type: "National", description: "" }
  ]);
  const [bulkError, setBulkError] = useState("");

  const isAdmin = currentUser.role === "Admin";

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Color mapper for holiday badges & backgrounds
  const holidayTypeColors = {
    National: {
      badge: "bg-rose-100 text-rose-700 ring-1 ring-rose-200/60",
      grid: "bg-rose-50/70 border-rose-100/80 hover:bg-rose-100/50 text-rose-700",
    },
    Company: {
      badge: "bg-blue-100 text-[#025085] ring-1 ring-blue-200/60",
      grid: "bg-blue-50/70 border-blue-100/80 hover:bg-blue-100/50 text-[#025085]",
    },
    Optional: {
      badge: "bg-amber-100 text-amber-700 ring-1 ring-amber-200/60",
      grid: "bg-amber-50/70 border-amber-100/80 hover:bg-amber-100/50 text-amber-700",
    },
    Festival: {
      badge: "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200/60",
      grid: "bg-indigo-50/70 border-indigo-100/80 hover:bg-indigo-100/50 text-indigo-700",
    },
  };

  // Month Names
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Year Range
  const yearOptions = [2025, 2026, 2027];

  // Format YYYY-MM-DD
  const formatDateString = (year: number, month: number, day: number) => {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  };

  // Calendar logic
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const startDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday

  // Group holidays by date
  const holidaysByDate = useMemo(() => {
    const map: Record<string, Holiday[]> = {};
    holidays.forEach(h => {
      if (!map[h.date]) {
        map[h.date] = [];
      }
      map[h.date].push(h);
    });
    return map;
  }, [holidays]);

  // Navigate Months
  const handlePrevMonth = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const handleMonthChange = (val: string) => {
    const m = parseInt(val, 10);
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setMonth(m);
      return d;
    });
  };

  const handleYearChange = (val: string) => {
    const y = parseInt(val, 10);
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setFullYear(y);
      return d;
    });
  };

  // Form submission for Single Holiday
  const openAddModal = () => {
    setEditingHoliday(null);
    setFormTitle("");
    setFormDate("");
    setFormType("National");
    setFormDesc("");
    setFormError("");
    setShowAddEditModal(true);
  };

  const openEditModal = (holiday: Holiday, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setEditingHoliday(holiday);
    setFormTitle(holiday.title);
    setFormDate(holiday.date);
    setFormType(holiday.type);
    setFormDesc(holiday.description);
    setFormError("");
    setShowAddEditModal(true);
  };

  const handleSaveHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError("Title is required.");
      return;
    }
    if (!formDate) {
      setFormError("Date is required.");
      return;
    }

    // Check for duplicate (same date & title, ignoring case and spaces)
    const normalizedTitle = formTitle.trim().toLowerCase();
    const isDuplicate = holidays.some(h => 
      h.date === formDate && 
      h.title.trim().toLowerCase() === normalizedTitle &&
      (!editingHoliday || h.id !== editingHoliday.id)
    );

    if (isDuplicate) {
      setFormError("A holiday with the same title on this date already exists.");
      return;
    }

    if (editingHoliday) {
      // Edit
      setHolidays(prev => prev.map(h => 
        h.id === editingHoliday.id 
          ? { ...h, title: formTitle.trim(), date: formDate, type: formType, description: formDesc.trim() }
          : h
      ));

      // Activity log
      const activity: ActivityRecord = {
        id: Date.now(),
        user: currentUser.name,
        action: "updated holiday",
        target: `${formTitle.trim()} (${formDate})`,
        time: "Just now",
        avatar: currentUser.avatar
      };
      setActivities(prev => [activity, ...prev]);
    } else {
      // Create
      const newHoliday: Holiday = {
        id: `HOL-${Math.floor(1000 + Math.random() * 9000)}`,
        title: formTitle.trim(),
        date: formDate,
        type: formType,
        description: formDesc.trim()
      };
      setHolidays(prev => [...prev, newHoliday]);

      // Activity log
      const activity: ActivityRecord = {
        id: Date.now(),
        user: currentUser.name,
        action: "added holiday",
        target: `${formTitle.trim()} (${formDate})`,
        time: "Just now",
        avatar: currentUser.avatar
      };
      setActivities(prev => [activity, ...prev]);
    }

    setShowAddEditModal(false);
  };

  const handleDeleteHoliday = (id: string, title: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setDeletingHoliday({ id, title });
  };

  const confirmDeleteHoliday = () => {
    if (!deletingHoliday) return;
    const { id, title } = deletingHoliday;
    setHolidays(prev => prev.filter(h => h.id !== id));
    
    // Activity log
    const activity: ActivityRecord = {
      id: Date.now(),
      user: currentUser.name,
      action: "deleted holiday",
      target: title,
      time: "Just now",
      avatar: currentUser.avatar
    };
    setActivities(prev => [activity, ...prev]);

    if (selectedHoliday && selectedHoliday.id === id) {
      setSelectedHoliday(null);
    }
    setDeletingHoliday(null);
  };

  // Bulk Holiday Add
  const openBulkModal = () => {
    setBulkRows([{ title: "", date: "", type: "National", description: "" }]);
    setBulkError("");
    setShowBulkModal(true);
  };

  const addBulkRow = () => {
    setBulkRows(prev => [...prev, { title: "", date: "", type: "National", description: "" }]);
  };

  const removeBulkRow = (index: number) => {
    if (bulkRows.length === 1) return;
    setBulkRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleBulkRowChange = (index: number, key: keyof Omit<Holiday, "id">, value: string) => {
    setBulkRows(prev => prev.map((row, i) => {
      if (i === index) {
        return { ...row, [key]: value };
      }
      return row;
    }));
  };

  const handleSaveBulkHolidays = (e: React.FormEvent) => {
    e.preventDefault();
    setBulkError("");

    // Validate rows
    const validRows: Omit<Holiday, "id">[] = [];
    const seenCombos = new Set<string>();

    for (let i = 0; i < bulkRows.length; i++) {
      const row = bulkRows[i];
      const title = row.title.trim();
      const date = row.date;

      if (!title && !date) {
        // Skip entirely empty rows
        continue;
      }

      if (!title || !date) {
        setBulkError(`Row ${i + 1} has incomplete fields. Both title and date are required.`);
        return;
      }

      const combo = `${date}::${title.toLowerCase()}`;
      if (seenCombos.has(combo)) {
        setBulkError(`Row ${i + 1} contains a duplicate entry within the bulk submission.`);
        return;
      }
      seenCombos.add(combo);

      // Check against existing database
      const isDbDuplicate = holidays.some(h => 
        h.date === date && 
        h.title.trim().toLowerCase() === title.toLowerCase()
      );
      if (isDbDuplicate) {
        setBulkError(`Holiday "${title}" on ${date} already exists in the calendar.`);
        return;
      }

      validRows.push({
        title,
        date,
        type: row.type,
        description: row.description.trim()
      });
    }

    if (validRows.length === 0) {
      setBulkError("Please fill out at least one holiday row.");
      return;
    }

    // Insert all
    const newHolidays: Holiday[] = validRows.map(row => ({
      ...row,
      id: `HOL-${Math.floor(1000 + Math.random() * 9000)}`
    }));

    setHolidays(prev => [...prev, ...newHolidays]);

    // Activity log
    const activity: ActivityRecord = {
      id: Date.now(),
      user: currentUser.name,
      action: "added bulk holidays",
      target: `${newHolidays.length} holidays`,
      time: "Just now",
      avatar: currentUser.avatar
    };
    setActivities(prev => [activity, ...prev]);

    setShowBulkModal(false);
  };

  // Helper to calculate days remaining
  const getDaysRemaining = (holidayDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(holidayDateStr);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Filter holidays for the active tab list (Yearly view)
  const activeYearHolidays = useMemo(() => {
    return holidays
      .filter(h => new Date(h.date).getFullYear() === currentYear)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [holidays, currentYear]);

  // Calendar cells generation
  const calendarCells = useMemo(() => {
    const cells = [];
    
    // Previous month filler cells
    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push({ isFiller: true, key: `filler-${i}` });
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateString(currentYear, currentMonth, day);
      const dayHolidays = holidaysByDate[dateStr] || [];
      const cellDate = new Date(currentYear, currentMonth, day);
      const isWeekend = cellDate.getDay() === 0 || cellDate.getDay() === 6;
      const isToday = new Date().toDateString() === cellDate.toDateString();

      cells.push({
        isFiller: false,
        day,
        dateStr,
        holidays: dayHolidays,
        isWeekend,
        isToday,
        key: `day-${day}`
      });
    }

    return cells;
  }, [currentYear, currentMonth, daysInMonth, startDayOfWeek, holidaysByDate]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Holiday Calendar"
        subtitle="View national, company, optional, and festival holidays"
        actions={
          isAdmin && (
            <div className="flex gap-2">
              <Button variant="secondary" size="md" onClick={openBulkModal} leftIcon={<Plus className="h-4 w-4" />}>
                Add Multiple
              </Button>
              <Button variant="gradient" size="md" onClick={openAddModal} leftIcon={<Plus className="h-4 w-4" />}>
                Add Holiday
              </Button>
            </div>
          )
        }
      />

      {/* Tabs & View Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
          <button
            onClick={() => setActiveTab("calendar")}
            className={`inline-flex h-8 items-center gap-2 rounded-lg px-4 text-xs font-semibold transition-all ${
              activeTab === "calendar" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Calendar View
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`inline-flex h-8 items-center gap-2 rounded-lg px-4 text-xs font-semibold transition-all ${
              activeTab === "list" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Yearly Holiday List
          </button>
        </div>

        {/* Month/Year Selectors */}
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handlePrevMonth} className="h-9 px-2">
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Select
            value={currentMonth.toString()}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="h-9 min-w-[120px] text-xs py-1"
          >
            {monthNames.map((name, idx) => (
              <option key={idx} value={idx.toString()}>{name}</option>
            ))}
          </Select>

          <Select
            value={currentYear.toString()}
            onChange={(e) => handleYearChange(e.target.value)}
            className="h-9 min-w-[90px] text-xs py-1"
          >
            {yearOptions.map(y => (
              <option key={y} value={y.toString()}>{y}</option>
            ))}
          </Select>

          <Button variant="secondary" size="sm" onClick={handleNextMonth} className="h-9 px-2">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {activeTab === "calendar" ? (
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-extrabold text-slate-900">
              {monthNames[currentMonth]} {currentYear}
            </h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-rose-50 border border-rose-100" />
                <span className="text-slate-600 font-medium">National</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-blue-50 border border-blue-100" />
                <span className="text-slate-600 font-medium">Company</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-amber-50 border border-amber-100" />
                <span className="text-slate-600 font-medium">Optional</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-indigo-50 border border-indigo-100" />
                <span className="text-slate-600 font-medium">Festival</span>
              </div>
            </div>
          </div>

          {/* Week Days Headers */}
          <div className="grid grid-cols-7 gap-2 border-b border-slate-100 pb-2 text-center text-xs font-bold text-slate-500">
            <div>SUN</div>
            <div>MON</div>
            <div>TUE</div>
            <div>WED</div>
            <div>THU</div>
            <div>FRI</div>
            <div>SAT</div>
          </div>

          {/* Calendar Day Cells */}
          <div className="mt-2 grid grid-cols-7 gap-2">
            {calendarCells.map((cell) => {
              if (cell.isFiller) {
                return <div key={cell.key} className="min-h-[110px] rounded-xl bg-slate-50/40" />;
              }

              const hasHolidays = cell.holidays && cell.holidays.length > 0;
              const mainHoliday = hasHolidays ? cell.holidays[0] : null;
              
              let cellClass = "min-h-[110px] rounded-xl border p-2 transition-all flex flex-col justify-between ";
              
              if (cell.isToday) {
                cellClass += "border-indigo-500 ring-2 ring-indigo-100/50 bg-indigo-50/10 ";
              } else if (hasHolidays && mainHoliday) {
                const colors = holidayTypeColors[mainHoliday.type] || holidayTypeColors.National;
                cellClass += `border border-current ${colors.grid} cursor-pointer shadow-sm hover:scale-[1.01] `;
              } else {
                cellClass += "border-slate-100 bg-white hover:border-slate-200 ";
              }

              return (
                <div
                  key={cell.key}
                  onClick={() => hasHolidays && setSelectedHoliday(cell.holidays[0])}
                  className={cellClass}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${
                      cell.isToday ? "text-indigo-600 h-5 w-5 bg-indigo-100 rounded-full flex items-center justify-center" : 
                      cell.isWeekend ? "text-slate-400" : "text-slate-600"
                    }`}>
                      {cell.day}
                    </span>
                    {cell.isToday && (
                      <span className="text-[9px] font-extrabold uppercase text-indigo-600 bg-indigo-50 px-1 rounded">
                        Today
                      </span>
                    )}
                  </div>

                  <div className="mt-2 space-y-1">
                    {cell.holidays && cell.holidays.map(h => (
                      <div
                        key={h.id}
                        className="truncate text-[10px] font-bold px-1 py-0.5 rounded border-none leading-tight"
                        title={h.title}
                      >
                        {h.title}
                      </div>
                    ))}
                  </div>

                  {/* Actions shortcut on grid for Admin if has holiday */}
                  {isAdmin && hasHolidays && (
                    <div className="mt-auto pt-1 flex justify-end gap-1 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity">
                      {/* Grid clicks trigger Details modal, so standard edit icons can be accessed via hover or Yearly table */}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardHeader
            title={`Holidays in ${currentYear}`}
            subtitle={`${activeYearHolidays.length} scheduled holidays`}
          />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-600">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Holiday Title</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Description</th>
                  {isAdmin && <th className="px-6 py-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeYearHolidays.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 5 : 4} className="px-6 py-12 text-center text-slate-500">
                      No holidays added for this year yet.
                    </td>
                  </tr>
                ) : (
                  activeYearHolidays.map((h) => {
                    const colors = holidayTypeColors[h.type] || holidayTypeColors.National;
                    const dateObj = new Date(h.date);
                    const formattedDate = dateObj.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric"
                    });
                    const remainingDays = getDaysRemaining(h.date);

                    return (
                      <tr key={h.id} className="hover:bg-slate-50/50">
                        <td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-900">
                          {formattedDate}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-950">{h.title}</div>
                          {remainingDays > 0 ? (
                            <div className="text-[10px] font-bold text-indigo-600 mt-0.5">
                              In {remainingDays} {remainingDays === 1 ? "day" : "days"}
                            </div>
                          ) : remainingDays === 0 ? (
                            <div className="text-[10px] font-bold text-emerald-600 mt-0.5">
                              Today 🎉
                            </div>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <Badge variant="neutral" className={colors.badge}>
                            {h.type}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-slate-500 max-w-xs truncate" title={h.description}>
                          {h.description || "—"}
                        </td>
                        {isAdmin && (
                          <td className="whitespace-nowrap px-6 py-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600"
                                onClick={(e) => openEditModal(h, e)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600"
                                onClick={(e) => handleDeleteHoliday(h.id, h.title, e)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Details Modal */}
      {selectedHoliday && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 transition-all">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display text-lg font-extrabold text-slate-900">Holiday Details</h3>
              <button
                onClick={() => setSelectedHoliday(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Title</label>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">{selectedHoliday.title}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</label>
                  <div className="text-sm font-semibold text-slate-800 mt-0.5">
                    {new Date(selectedHoliday.date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric"
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Type</label>
                  <div className="mt-0.5">
                    <Badge variant="neutral" className={holidayTypeColors[selectedHoliday.type]?.badge}>
                      {selectedHoliday.type}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Description</label>
                <div className="text-sm text-slate-600 mt-0.5 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                  {selectedHoliday.description || "No description provided."}
                </div>
              </div>

              {/* Remaining days card inside details */}
              {(() => {
                const remaining = getDaysRemaining(selectedHoliday.date);
                if (remaining > 0) {
                  return (
                    <div className="flex items-center gap-3 rounded-xl bg-indigo-50 border border-indigo-100 p-3 text-indigo-700">
                      <Info className="h-5 w-5 shrink-0" />
                      <div className="text-xs font-semibold">
                        This holiday is in <span className="font-extrabold">{remaining} days</span>. Enjoy your upcoming day off!
                      </div>
                    </div>
                  );
                } else if (remaining === 0) {
                  return (
                    <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-emerald-700">
                      <HelpCircle className="h-5 w-5 shrink-0" />
                      <div className="text-xs font-semibold">
                        Today is this holiday! Happy {selectedHoliday.title}! 🎉
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              {isAdmin && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const hol = selectedHoliday;
                      setSelectedHoliday(null);
                      openEditModal(hol);
                    }}
                  >
                    Edit Holiday
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteHoliday(selectedHoliday.id, selectedHoliday.title)}
                  >
                    Delete
                  </Button>
                </>
              )}
              <Button variant="primary" size="sm" onClick={() => setSelectedHoliday(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Holiday Modal */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <form onSubmit={handleSaveHoliday} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display text-lg font-extrabold text-slate-900">
                {editingHoliday ? "Edit Holiday" : "Add New Holiday"}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddEditModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <Input
                label="Holiday Title"
                placeholder="e.g. Republic Day"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
                <Select
                  label="Holiday Type"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as Holiday["type"])}
                >
                  <option value="National">National Holiday</option>
                  <option value="Company">Company Holiday</option>
                  <option value="Optional">Optional Holiday</option>
                  <option value="Festival">Festival Holiday</option>
                </Select>
              </div>

              <Textarea
                label="Description"
                placeholder="Brief description of the holiday"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
              />

              {formError && (
                <div className="rounded-lg bg-rose-50 border border-rose-100 p-3 text-xs font-semibold text-rose-600">
                  {formError}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowAddEditModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Save Holiday
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Bulk Add Holidays Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <form onSubmit={handleSaveBulkHolidays} className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div>
                <h3 className="font-display text-lg font-extrabold text-slate-900">Bulk Add Holidays</h3>
                <p className="text-xs text-slate-500 mt-0.5">Quickly add multiple holidays to the calendar</p>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-2 scrollbar-thin">
              {bulkRows.map((row, idx) => (
                <div key={idx} className="relative flex flex-col md:flex-row gap-3 border border-slate-100 bg-slate-50/40 p-4 rounded-xl items-end">
                  <div className="flex-1">
                    <Input
                      label={idx === 0 ? "Holiday Title" : undefined}
                      placeholder="e.g. Eid-ul-Fitr"
                      value={row.title}
                      onChange={(e) => handleBulkRowChange(idx, "title", e.target.value)}
                    />
                  </div>

                  <div className="w-full md:w-40">
                    <Input
                      label={idx === 0 ? "Date" : undefined}
                      type="date"
                      value={row.date}
                      onChange={(e) => handleBulkRowChange(idx, "date", e.target.value)}
                    />
                  </div>

                  <div className="w-full md:w-44">
                    <Select
                      label={idx === 0 ? "Type" : undefined}
                      value={row.type}
                      onChange={(e) => handleBulkRowChange(idx, "type", e.target.value as Holiday["type"])}
                    >
                      <option value="National">National</option>
                      <option value="Company">Company</option>
                      <option value="Optional">Optional</option>
                      <option value="Festival">Festival</option>
                    </Select>
                  </div>

                  <div className="flex-1">
                    <Input
                      label={idx === 0 ? "Description (Optional)" : undefined}
                      placeholder="Brief notes"
                      value={row.description}
                      onChange={(e) => handleBulkRowChange(idx, "description", e.target.value)}
                    />
                  </div>

                  {bulkRows.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-rose-500 hover:bg-rose-50 h-10 w-10 p-0 flex items-center justify-center shrink-0"
                      onClick={() => removeBulkRow(idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addBulkRow}
                className="w-full border-dashed border-slate-300 hover:border-slate-400 mt-2"
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Add Row
              </Button>

              {bulkError && (
                <div className="rounded-lg bg-rose-50 border border-rose-100 p-3 text-xs font-semibold text-rose-600 mt-4">
                  {bulkError}
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-4 shrink-0">
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowBulkModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Save All Holidays
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm Delete Holiday Modal */}
      <ConfirmModal
        isOpen={deletingHoliday !== null}
        title="Delete Holiday"
        message={`Are you sure you want to permanently delete the holiday "${deletingHoliday?.title}"?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDeleteHoliday}
        onCancel={() => setDeletingHoliday(null)}
      />
    </div>
  );
}
