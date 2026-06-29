import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  IndianRupee, Search, Download, Eye, Printer,
  TrendingUp, Users, CheckCircle2, Clock, FileText, AlertCircle,
  BadgeCheck, Banknote, Calculator, BarChart3, X, Edit3, Save, RefreshCw,
} from "lucide-react";
import { Card, Button, Avatar } from "../components/ui";
import { type SyncedEmployee } from "../data/store";
import { supabase } from "../components/supabase";
import {
  type SalaryStructure, type PayrollRecord,
  computePayroll, formatINR, formatMonthLabel,
} from "../data/payrollStore";
import { cn } from "../utils/cn";

// ─── Helper ─────────────────────────────────────────────────────────────────

function statusColor(s: PayrollRecord["status"]) {
  switch (s) {
    case "Paid": return "bg-emerald-100 text-emerald-700";
    case "Processed": return "bg-blue-100 text-blue-700";
    case "Draft": return "bg-amber-100 text-amber-700";
    case "On Hold": return "bg-rose-100 text-rose-700";
  }
}

const CURRENT_MONTH = "2026-06";

// ─── Payslip Print View ─────────────────────────────────────────────────────

function PayslipModal({ record, onClose }: { record: PayrollRecord; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Payslip - ${record.empName} - ${record.monthLabel}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 13px; color: #1e293b; }
        .page { padding: 32px; max-width: 800px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #025085; padding-bottom: 20px; margin-bottom: 24px; }
        .company-name { font-size: 22px; font-weight: 800; }
        .tis { color: #E81D3B; } .nex { color: #025085; }
        .payslip-title { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #64748b; margin-top: 4px; }
        .emp-section { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; background: #f8fafc; border-radius: 8px; padding: 16px; }
        .field { display: flex; flex-direction: column; gap: 2px; }
        .label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; }
        .value { font-size: 13px; font-weight: 600; color: #1e293b; }
        .attend-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 24px; }
        .attend-card { background: #f1f5f9; border-radius: 8px; padding: 12px; text-align: center; }
        .attend-num { font-size: 20px; font-weight: 700; color: #025085; }
        .attend-label { font-size: 10px; color: #64748b; margin-top: 2px; }
        .salary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f1f5f9; padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; }
        td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
        .total-row td { font-weight: 700; background: #f8fafc; }
        .net-box { background: linear-gradient(135deg, #025085, #E81D3B); color: white; border-radius: 12px; padding: 20px; text-align: center; margin-top: 16px; }
        .net-label { font-size: 12px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.8; }
        .net-amount { font-size: 32px; font-weight: 800; margin-top: 4px; }
        .footer { margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 10px; color: #94a3b8; text-align: center; }
      </style></head><body>
      ${content.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onClick={onClose}>
      <div className="relative flex h-full max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#025085]" />
            <span className="font-bold text-slate-900">Payslip — {record.monthLabel}</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" leftIcon={<Printer className="h-3.5 w-3.5" />} onClick={handlePrint}>Print / Download PDF</Button>
            <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div ref={printRef} className="page">
            {/* Header */}
            <div className="header">
              <div>
                <div className="company-name"><span className="tis">TIS</span><span className="nex"> Nexus</span></div>
                <div className="payslip-title">Payslip — {record.monthLabel}</div>
                <div style={{fontSize:11,color:"#64748b",marginTop:4}}>TIS Nexus Technologies Pvt. Ltd.</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:11,color:"#94a3b8"}}>Payslip #</div>
                <div style={{fontWeight:700,fontSize:13}}>{record.id}</div>
                <div style={{fontSize:11,color:"#94a3b8",marginTop:8}}>Payment Mode</div>
                <div style={{fontWeight:600,fontSize:13}}>{record.paymentMode || "Bank Transfer"}</div>
              </div>
            </div>

            {/* Employee Info */}
            <div className="emp-section">
              {[
                ["Employee Name", record.empName],
                ["Employee Code", record.empId],
                ["Department", record.department],
                ["Designation", record.designation],
                ["Pay Period", record.monthLabel],
                ["Payment Date", record.paidAt ? new Date(record.paidAt).toLocaleDateString("en-IN") : "—"],
              ].map(([label, value]) => (
                <div key={label} className="field">
                  <span className="label">{label}</span>
                  <span className="value">{value}</span>
                </div>
              ))}
            </div>

            {/* Attendance Summary */}
            <div className="attend-grid">
              {[
                ["Working Days", record.workingDays],
                ["Days Present", record.presentDays],
                ["Paid Leave", record.paidLeaveDays],
                ["Unpaid Leave", record.unpaidLeaveDays],
              ].map(([label, val]) => (
                <div key={label as string} className="attend-card">
                  <div className="attend-num">{val}</div>
                  <div className="attend-label">{label}</div>
                </div>
              ))}
            </div>

            {/* Earnings & Deductions */}
            <div className="salary-grid">
              <div>
                <table>
                  <thead><tr><th>Earnings</th><th style={{textAlign:"right"}}>Amount (₹)</th></tr></thead>
                  <tbody>
                    {[
                      ["Basic Salary", record.basicSalary],
                      ["HRA", record.hra],
                      ["Transport Allowance", record.transportAllowance],
                      ["Medical Allowance", record.medicalAllowance],
                      ["Special Allowance", record.specialAllowance],
                      ...(record.bonus > 0 ? [["Bonus", record.bonus]] : []),
                      ...(record.incentives > 0 ? [["Incentives", record.incentives]] : []),
                      ...(record.overtimePay > 0 ? [["Overtime Pay", record.overtimePay]] : []),
                    ].map(([label, val]) => (
                      <tr key={label as string}><td>{label}</td><td style={{textAlign:"right"}}>{Number(val).toLocaleString("en-IN")}</td></tr>
                    ))}
                    <tr className="total-row"><td>Gross Salary</td><td style={{textAlign:"right",color:"#025085"}}>{record.grossSalary.toLocaleString("en-IN")}</td></tr>
                  </tbody>
                </table>
              </div>
              <div>
                <table>
                  <thead><tr><th>Deductions</th><th style={{textAlign:"right"}}>Amount (₹)</th></tr></thead>
                  <tbody>
                    {[
                      ["Provident Fund (12%)", record.pfDeduction],
                      ["Professional Tax", record.professionalTax],
                      ...(record.incomeTax > 0 ? [["Income Tax (TDS)", record.incomeTax]] : []),
                      ...(record.unpaidLeaveDeduction > 0 ? [["Unpaid Leave Deduction", record.unpaidLeaveDeduction]] : []),
                      ...(record.otherDeductions > 0 ? [["Other Deductions", record.otherDeductions]] : []),
                    ].map(([label, val]) => (
                      <tr key={label as string}><td>{label}</td><td style={{textAlign:"right"}}>{Number(val).toLocaleString("en-IN")}</td></tr>
                    ))}
                    <tr className="total-row"><td>Total Deductions</td><td style={{textAlign:"right",color:"#E81D3B"}}>{record.totalDeductions.toLocaleString("en-IN")}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Net Pay */}
            <div className="net-box">
              <div className="net-label">Net Salary (Take-Home)</div>
              <div className="net-amount">₹{record.netSalary.toLocaleString("en-IN")}</div>
            </div>

            <div className="footer">
              This is a computer-generated payslip and does not require a signature. &nbsp;·&nbsp; TIS Nexus Technologies Pvt. Ltd.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Salary Structure Edit Modal ─────────────────────────────────────────────

function SalaryStructureModal({
  structure,
  onSave,
  onClose,
}: {
  structure: SalaryStructure;
  onSave: (updated: SalaryStructure) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<SalaryStructure>({ ...structure });

  const set = (key: keyof SalaryStructure, val: string | number) =>
    setForm(f => ({ ...f, [key]: typeof val === "string" ? parseFloat(val) || 0 : val }));

  const monthly = form.basicSalary + form.hra + form.transportAllowance + form.medicalAllowance + form.specialAllowance + form.bonus + form.incentives;
  const totalDed = form.pfDeduction + form.professionalTax + form.incomeTax + form.otherDeductions;

  const fields: { key: keyof SalaryStructure; label: string; group: "earn" | "ded" }[] = [
    { key: "basicSalary", label: "Basic Salary", group: "earn" },
    { key: "hra", label: "HRA", group: "earn" },
    { key: "transportAllowance", label: "Transport Allowance", group: "earn" },
    { key: "medicalAllowance", label: "Medical Allowance", group: "earn" },
    { key: "specialAllowance", label: "Special Allowance", group: "earn" },
    { key: "bonus", label: "Bonus", group: "earn" },
    { key: "incentives", label: "Incentives", group: "earn" },
    { key: "pfDeduction", label: "PF Deduction (12%)", group: "ded" },
    { key: "professionalTax", label: "Professional Tax", group: "ded" },
    { key: "incomeTax", label: "Income Tax (TDS)", group: "ded" },
    { key: "otherDeductions", label: "Other Deductions", group: "ded" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onClick={onClose}>
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-[#025085]" />
            <span className="font-bold text-slate-900">Edit Salary Structure — {structure.empName}</span>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
                <TrendingUp className="h-3.5 w-3.5" /> Earnings
              </div>
              <div className="flex flex-col gap-3">
                {fields.filter(f => f.group === "earn").map(f => (
                  <div key={f.key} className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-600">{f.label}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                      <input
                        type="number" min={0}
                        value={form[f.key] as number}
                        onChange={e => set(f.key, e.target.value)}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-7 pr-3.5 text-sm text-slate-900 focus:border-[#025085] focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-700">
                <AlertCircle className="h-3.5 w-3.5" /> Deductions
              </div>
              <div className="flex flex-col gap-3">
                {fields.filter(f => f.group === "ded").map(f => (
                  <div key={f.key} className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-600">{f.label}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                      <input
                        type="number" min={0}
                        value={form[f.key] as number}
                        onChange={e => set(f.key, e.target.value)}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-7 pr-3.5 text-sm text-slate-900 focus:border-[#025085] focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary Preview */}
          <div className="mt-6 rounded-xl bg-gradient-to-r from-[#025085]/10 to-[#E81D3B]/10 border border-slate-200 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Monthly Summary Preview</div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-xs text-slate-500">Gross Salary</div>
                <div className="text-lg font-bold text-emerald-700">{formatINR(monthly)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500">Total Deductions</div>
                <div className="text-lg font-bold text-rose-600">{formatINR(totalDed)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500">Net Salary</div>
                <div className="text-lg font-bold text-[#025085]">{formatINR(Math.max(0, monthly - totalDed))}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              onSave({ ...form, updatedAt: new Date().toISOString() });
              onClose();
            }}
          >
            Save Structure
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Run Payroll Modal ────────────────────────────────────────────────────────

function RunPayrollModal({
  structures,
  existingRecords,
  onRun,
  onClose,
  processedBy,
}: {
  structures: SalaryStructure[];
  existingRecords: PayrollRecord[];
  onRun: (records: PayrollRecord[]) => void;
  onClose: () => void;
  processedBy: string;
}) {
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [workingDays, setWorkingDays] = useState(26);
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>(structures.map(s => s.empId));

  const monthExists = existingRecords.some(r => r.month === month);
  const selectedStructures = structures.filter(s => selectedEmpIds.includes(s.empId));

  const toggleAll = () => {
    if (selectedEmpIds.length === structures.length) setSelectedEmpIds([]);
    else setSelectedEmpIds(structures.map(s => s.empId));
  };

  const toggle = (id: string) =>
    setSelectedEmpIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleRun = () => {
    const now = new Date().toISOString();
    const label = formatMonthLabel(month);
    const newRecords: PayrollRecord[] = selectedStructures.map(s => {
      const computed = computePayroll(s, workingDays, workingDays, 0, 0, 0, 0);
      return {
        ...computed,
        id: `PR-${month}-${s.empId}`,
        empId: s.empId,
        empName: s.empName,
        department: s.department,
        designation: s.designation,
        month,
        monthLabel: label,
        status: "Processed",
        processedBy,
        processedAt: now,
      };
    });
    onRun(newRecords);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onClick={onClose}>
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-[#025085]" />
            <span className="font-bold text-slate-900">Run Monthly Payroll</span>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700">Pay Month</label>
              <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 focus:border-[#025085] focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700">Working Days</label>
              <input type="number" min={1} max={31} value={workingDays} onChange={e => setWorkingDays(parseInt(e.target.value) || 26)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 focus:border-[#025085] focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all" />
            </div>
          </div>

          {monthExists && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Payroll records already exist for <strong>{formatMonthLabel(month)}</strong>. Running again will replace the existing draft records.</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Select Employees ({selectedEmpIds.length}/{structures.length})</span>
              <button onClick={toggleAll} className="text-xs font-semibold text-[#025085] hover:underline">
                {selectedEmpIds.length === structures.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
              {structures.map(s => (
                <label key={s.empId} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50 border border-slate-100">
                  <input type="checkbox" checked={selectedEmpIds.includes(s.empId)} onChange={() => toggle(s.empId)}
                    className="h-4 w-4 rounded accent-[#025085]" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900">{s.empName}</div>
                    <div className="text-xs text-slate-500">{s.department} · {formatINR(s.basicSalary + s.hra + s.transportAllowance + s.medicalAllowance + s.specialAllowance)}/mo</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            leftIcon={<RefreshCw className="h-4 w-4" />}
            disabled={selectedEmpIds.length === 0}
            onClick={handleRun}
          >
            Generate Payroll ({selectedEmpIds.length} Employees)
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Payroll Page ────────────────────────────────────────────────────────

export function Payroll({ currentUser, search, setSearch }: { currentUser: SyncedEmployee; search?: string; setSearch?: (s: string) => void }) {
  const isAdmin = currentUser.role === "Admin" || currentUser.role === "Founder" || currentUser.role === "Cofounder";

  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [records, setRecords] = useState<PayrollRecord[]>([]);

  const [tab, setTab] = useState<string>(isAdmin ? "dashboard" : "my-salary");
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

  const [filterMonth, setFilterMonth] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDept, setFilterDept] = useState("all");

  const [payslipRecord, setPayslipRecord] = useState<PayrollRecord | null>(null);
  const [editStructure, setEditStructure] = useState<SalaryStructure | null>(null);
  const [showRunPayroll, setShowRunPayroll] = useState(false);

  // ─── Derived Data ───────────────────────────────────────────────────────────

  const myStructure = structures.find(s => s.empId === currentUser.id);
  const myRecords = records.filter(r => r.empId === currentUser.id);

  const months = useMemo(() => {
    const all = [...new Set(records.map(r => r.month))].sort().reverse();
    return all;
  }, [records]);

  const departments = useMemo(() => [...new Set(structures.map(s => s.department))].sort(), [structures]);

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (!isAdmin && r.empId !== currentUser.id) return false;
      if (filterMonth !== "all" && r.month !== filterMonth) return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (filterDept !== "all" && r.department !== filterDept) return false;
      if (debouncedSearch && !r.empName.toLowerCase().includes(debouncedSearch.toLowerCase()) && !r.empId.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
      return true;
    });
  }, [records, filterMonth, filterStatus, filterDept, debouncedSearch, isAdmin, currentUser.id]);

  const filteredStructures = useMemo(() => {
    return structures.filter(s => {
      if (filterDept !== "all" && s.department !== filterDept) return false;
      if (debouncedSearch && !s.empName.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
      return true;
    });
  }, [structures, filterDept, debouncedSearch]);

  // ─── Dashboard KPIs ─────────────────────────────────────────────────────────

  const latestMonth = months[0] || CURRENT_MONTH;
  const latestRecords = records.filter(r => r.month === latestMonth);
  const paidRecords = latestRecords.filter(r => r.status === "Paid");
  const totalPayroll = latestRecords.reduce((sum, r) => sum + r.netSalary, 0);
  const totalGross = latestRecords.reduce((sum, r) => sum + r.grossSalary, 0);
  const pendingCount = latestRecords.filter(r => r.status === "Draft" || r.status === "Processed").length;

  // ─── Handlers ───────────────────────────────────────────────────────────────

  // Helpers
  function extractDbId(empId: string): number | null {
    const parts = empId.split("-");
    const num = parseInt(parts[parts.length - 1] || "", 10);
    return isNaN(num) ? null : num;
  }

  const fetchPayrollData = useCallback(async () => {
    try {
      const { data: structData, error: structErr } = await supabase
        .from("salary_structures")
        .select(`
          *,
          employees (
            id,
            full_name,
            department
          )
        `);
      if (structErr) throw structErr;

      const { data: payrollData, error: payrollErr } = await supabase
        .from("payroll_records")
        .select(`
          *,
          employees (
            id,
            full_name,
            department,
            official_email
          )
        `);
      if (payrollErr) throw payrollErr;

      if (structData) {
        const mappedStructs: SalaryStructure[] = structData.map((row: any) => {
          const emp = row.employees || {};
          const padId = String(emp.id || 0).padStart(3, "0");
          return {
            empId: `EMP-${padId}`,
            empName: emp.full_name || "Unknown",
            department: emp.department || "General",
            designation: emp.designation || "Employee",
            basicSalary: Number(row.basic_salary) || 0,
            hra: Number(row.hra) || 0,
            transportAllowance: Number(row.transport_allowance) || 0,
            medicalAllowance: Number(row.medical_allowance) || 0,
            specialAllowance: Number(row.special_allowance) || 0,
            bonus: Number(row.bonus) || 0,
            incentives: Number(row.incentives) || 0,
            pfDeduction: Number(row.pf_deduction) || 0,
            professionalTax: Number(row.professional_tax) || 0,
            incomeTax: Number(row.income_tax) || 0,
            otherDeductions: Number(row.other_deductions) || 0,
            overtimeRatePerHour: Number(row.overtime_rate_per_hour) || 0,
            effectiveFrom: row.effective_from || "",
            createdBy: row.created_by || "System",
            updatedAt: row.updated_at || ""
          };
        });
        setStructures(mappedStructs);
      }

      if (payrollData) {
        const mappedRecords: PayrollRecord[] = payrollData.map((row: any) => {
          const emp = row.employees || {};
          const padId = String(emp.id || 0).padStart(3, "0");
          return {
            id: row.id,
            empId: `EMP-${padId}`,
            empName: emp.full_name || "Unknown",
            email: emp.official_email || "",
            department: emp.department || "General",
            designation: emp.designation || "Employee",
            avatar: `data:image/svg+xml;utf8,${encodeURIComponent(
              `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#8b5cf6"/></linearGradient></defs><rect width="80" height="80" rx="40" fill="url(#g)"/><text x="50%" y="54%" text-anchor="middle" font-family="Inter, sans-serif" font-size="28" font-weight="700" fill="white" dominant-baseline="middle">${(emp.full_name || "U").split(" ").map((p: any) => p[0]).slice(0, 2).join("").toUpperCase()}</text></svg>`
            )}`,
            month: row.month,
            monthLabel: row.month_label,
            workingDays: row.working_days,
            presentDays: row.present_days,
            absentDays: row.absent_days,
            paidLeaveDays: row.paid_leave_days,
            unpaidLeaveDays: row.unpaid_leave_days,
            overtimeHours: Number(row.overtime_hours) || 0,
            basicSalary: Number(row.basic_salary) || 0,
            hra: Number(row.hra) || 0,
            transportAllowance: Number(row.transport_allowance) || 0,
            medicalAllowance: Number(row.medical_allowance) || 0,
            specialAllowance: Number(row.special_allowance) || 0,
            bonus: Number(row.bonus) || 0,
            incentives: Number(row.incentives) || 0,
            overtimePay: Number(row.overtime_pay) || 0,
            grossSalary: Number(row.gross_salary) || 0,
            pfDeduction: Number(row.pf_deduction) || 0,
            professionalTax: Number(row.professional_tax) || 0,
            incomeTax: Number(row.income_tax) || 0,
            unpaidLeaveDeduction: Number(row.unpaid_leave_deduction) || 0,
            otherDeductions: Number(row.other_deductions) || 0,
            totalDeductions: Number(row.total_deductions) || 0,
            netSalary: Number(row.net_salary) || 0,
            status: row.status,
            processedBy: row.processed_by,
            processedAt: row.processed_at,
            paidAt: row.paid_at,
            paymentMode: row.payment_mode,
            remarks: row.remarks
          };
        });
        
        // Filter by user role if not admin
        const filtered = mappedRecords.filter(r => isAdmin || r.empId === currentUser.id);
        setRecords(filtered);
      }
    } catch (e: any) {
      console.error("fetchPayrollData failed:", e.message);
    }
  }, [currentUser.id, isAdmin]);

  useEffect(() => {
    fetchPayrollData();
  }, [fetchPayrollData]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleSaveStructure = async (updated: SalaryStructure) => {
    const dbEmpId = extractDbId(updated.empId);
    if (!dbEmpId) return;

    const dbRow = {
      employee_id: dbEmpId,
      basic_salary: updated.basicSalary,
      hra: updated.hra,
      transport_allowance: updated.transportAllowance,
      medical_allowance: updated.medicalAllowance,
      special_allowance: updated.specialAllowance,
      bonus: updated.bonus,
      incentives: updated.incentives,
      pf_deduction: updated.pfDeduction,
      professional_tax: updated.professionalTax,
      income_tax: updated.incomeTax,
      other_deductions: updated.otherDeductions,
      overtime_rate_per_hour: updated.overtimeRatePerHour,
      effective_from: updated.effectiveFrom,
      created_by: updated.createdBy,
      updated_at: new Date().toISOString()
    };

    try {
      const { error: sbErr } = await supabase
        .from("salary_structures")
        .upsert(dbRow, { onConflict: "employee_id" });
      if (sbErr) throw sbErr;
      await fetchPayrollData();
    } catch (e: any) {
      console.error("handleSaveStructure failed:", e.message);
    }
  };

  const handleRunPayroll = async (newRecords: PayrollRecord[]) => {
    const monthStr = newRecords[0]?.month;
    try {
      if (monthStr) {
        await supabase
          .from("payroll_records")
          .delete()
          .eq("month", monthStr)
          .in("status", ["Draft", "Processed"]);
      }

      const upsertRows = newRecords.map(rec => {
        const dbEmpId = extractDbId(rec.empId);
        return {
          id: rec.id,
          employee_id: dbEmpId!,
          month: rec.month,
          month_label: rec.monthLabel,
          working_days: rec.workingDays,
          present_days: rec.presentDays,
          absent_days: rec.absentDays,
          paid_leave_days: rec.paidLeaveDays,
          unpaid_leave_days: rec.unpaidLeaveDays,
          overtime_hours: rec.overtimeHours,
          basic_salary: rec.basicSalary,
          hra: rec.hra,
          transport_allowance: rec.transportAllowance,
          medical_allowance: rec.medicalAllowance,
          special_allowance: rec.specialAllowance,
          bonus: rec.bonus,
          incentives: rec.incentives,
          overtime_pay: rec.overtimePay,
          gross_salary: rec.grossSalary,
          pf_deduction: rec.pfDeduction,
          professional_tax: rec.professionalTax,
          income_tax: rec.incomeTax,
          unpaid_leave_deduction: rec.unpaidLeaveDeduction,
          other_deductions: rec.otherDeductions,
          total_deductions: rec.totalDeductions,
          net_salary: rec.netSalary,
          status: rec.status,
          processed_by: rec.processedBy,
          processed_at: rec.processedAt,
          paid_at: rec.paidAt,
          payment_mode: rec.paymentMode,
          remarks: rec.remarks
        };
      });

      const { error: sbErr } = await supabase
        .from("payroll_records")
        .upsert(upsertRows);
      if (sbErr) throw sbErr;
      await fetchPayrollData();
    } catch (e: any) {
      console.error("handleRunPayroll failed:", e.message);
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      const { error: sbErr } = await supabase
        .from("payroll_records")
        .update({
          status: "Paid",
          paid_at: new Date().toISOString(),
          payment_mode: "Bank Transfer"
        })
        .eq("id", id);
      if (sbErr) throw sbErr;

      // Automatically send Payslip email notification to employee
      const matchedRecord = records.find(r => r.id === id);
      if (matchedRecord && matchedRecord.email) {
        try {
          const backendUrl = window.location.port === "5173"
            ? "http://localhost:3000/api/auth/send-notification-email"
            : "/api/auth/send-notification-email";
          await fetch(backendUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: matchedRecord.email,
              templateType: "Payroll",
              data: {
                name: matchedRecord.empName,
                month: matchedRecord.monthLabel,
                basicSalary: matchedRecord.basicSalary,
                hra: matchedRecord.hra,
                netSalary: matchedRecord.netSalary
              }
            })
          });
        } catch (mailErr) {
          console.warn("[Payroll] Send notification email error:", mailErr);
        }
      }

      await fetchPayrollData();
    } catch (e: any) {
      console.error("handleMarkPaid failed:", e.message);
    }
  };

  // ─── Admin Dashboard Tab ───────────────────────────────────────────────────

  const AdminDashboard = () => (
    <div className="flex flex-col gap-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            icon: IndianRupee, label: "Total Monthly Payroll", value: formatINR(totalPayroll),
            sub: `Gross: ${formatINR(totalGross)}`,
            color: "from-[#025085] to-[#00538C]", iconBg: "bg-white/20",
          },
          {
            icon: Users, label: "Total Employees", value: structures.length,
            sub: `${latestRecords.length} in latest cycle`,
            color: "from-violet-600 to-violet-700", iconBg: "bg-white/20",
          },
          {
            icon: CheckCircle2, label: "Employees Paid", value: paidRecords.length,
            sub: `of ${latestRecords.length} processed`,
            color: "from-emerald-600 to-emerald-700", iconBg: "bg-white/20",
          },
          {
            icon: Clock, label: "Pending Payments", value: pendingCount,
            sub: "Awaiting approval",
            color: "from-amber-500 to-orange-500", iconBg: "bg-white/20",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`rounded-2xl bg-gradient-to-br ${card.color} p-5 text-white shadow-lg`}>
              <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${card.iconBg}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="text-2xl font-extrabold">{card.value}</div>
              <div className="mt-0.5 text-xs font-semibold text-white/80">{card.label}</div>
              <div className="mt-1 text-[11px] text-white/60">{card.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Department Breakdown */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#025085]" />
            <span className="font-bold text-slate-900">Department Payroll Breakdown</span>
            <span className="text-xs text-slate-500">({formatMonthLabel(latestMonth)})</span>
          </div>
          <Button size="sm" variant="outline" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => setShowRunPayroll(true)}>
            Run Payroll
          </Button>
        </div>

        {departments.map(dept => {
          const deptRecords = latestRecords.filter(r => r.department === dept);
          const deptTotal = deptRecords.reduce((s, r) => s + r.netSalary, 0);
          const pct = totalPayroll > 0 ? (deptTotal / totalPayroll) * 100 : 0;
          const count = deptRecords.length;
          return (
            <div key={dept} className="mb-3 last:mb-0">
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">{dept}</span>
                  <span className="text-xs text-slate-500">({count} {count === 1 ? "employee" : "employees"})</span>
                </div>
                <span className="font-bold text-slate-900">{formatINR(deptTotal)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#025085] to-[#E81D3B] transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </Card>

      {/* Recent Payroll Records */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <span className="font-bold text-slate-900">Recent Payroll Records</span>
          <Button size="sm" variant="secondary" onClick={() => setTab("payslips")}>View All</Button>
        </div>
        <div className="divide-y divide-slate-50">
          {latestRecords.slice(0, 6).map(rec => (
            <div key={rec.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors">
              <Avatar src={rec.avatar} name={rec.empName} size={36} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-900">{rec.empName}</div>
                <div className="text-xs text-slate-500">{rec.department}</div>
              </div>
              <div className="text-sm font-bold text-[#025085]">{formatINR(rec.netSalary)}</div>
              <span className={cn("rounded-lg px-2.5 py-1 text-[11px] font-bold", statusColor(rec.status))}>{rec.status}</span>
              {rec.status !== "Paid" && (
                <Button size="sm" variant="soft" onClick={() => handleMarkPaid(rec.id)}>Mark Paid</Button>
              )}
              <button onClick={() => setPayslipRecord(rec)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <Eye className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  // ─── Salary Setup Tab ──────────────────────────────────────────────────────

  const SalarySetup = () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="Search employee…"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 text-sm text-slate-900 focus:border-[#025085] focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all" />
        </div>
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3.5 pr-8 text-sm text-slate-900 focus:border-[#025085] focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all">
          <option value="all">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <span className="text-xs text-slate-500">{filteredStructures.length} records</span>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Employee", "Department", "Basic", "HRA", "Allowances", "Gross CTC", "PF + Tax", "Net/Mo", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredStructures.map(s => {
                const gross = s.basicSalary + s.hra + s.transportAllowance + s.medicalAllowance + s.specialAllowance + s.bonus + s.incentives;
                const ded = s.pfDeduction + s.professionalTax + s.incomeTax + s.otherDeductions;
                const net = Math.max(0, gross - ded);
                const allowances = s.transportAllowance + s.medicalAllowance + s.specialAllowance;
                return (
                  <tr key={s.empId} className="transition-all duration-200 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{s.empName}</div>
                      <div className="text-[11px] text-slate-500">{s.empId}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.department}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{formatINR(s.basicSalary)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatINR(s.hra)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatINR(allowances)}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-700">{formatINR(gross)}</td>
                    <td className="px-4 py-3 text-rose-600">{formatINR(ded)}</td>
                    <td className="px-4 py-3 font-bold text-[#025085]">{formatINR(net)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setEditStructure(s)}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                        <Edit3 className="h-3.5 w-3.5" /> Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredStructures.length === 0 && (
            <div className="py-16 text-center text-slate-400">No salary structures found.</div>
          )}
        </div>
      </Card>
    </div>
  );

  // ─── Payslips Tab ──────────────────────────────────────────────────────────

  const PayslipsTab = () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="Search employee…"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 text-sm text-slate-900 focus:border-[#025085] focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all" />
        </div>
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3.5 pr-8 text-sm text-slate-900 focus:border-[#025085] focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all">
          <option value="all">All Months</option>
          {months.map(m => <option key={m} value={m}>{formatMonthLabel(m)}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3.5 pr-8 text-sm text-slate-900 focus:border-[#025085] focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all">
          <option value="all">All Status</option>
          {["Draft", "Processed", "Paid", "On Hold"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {isAdmin && (
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3.5 pr-8 text-sm text-slate-900 focus:border-[#025085] focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all">
            <option value="all">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        <span className="text-xs text-slate-500">{filteredRecords.length} records</span>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {[
                  "Employee", "Pay Period", "Working Days", "Present", "Gross", "Deductions", "Net Salary", "Status", "Actions"
                ].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredRecords.map(rec => (
                <tr key={rec.id} className="transition-all duration-200 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar src={rec.avatar} name={rec.empName} size={32} />
                      <div>
                        <div className="font-semibold text-slate-900">{rec.empName}</div>
                        <div className="text-[11px] text-slate-500">{rec.department}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{rec.monthLabel}</td>
                  <td className="px-4 py-3 text-center">{rec.workingDays}</td>
                  <td className="px-4 py-3 text-center">{rec.presentDays}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-700">{formatINR(rec.grossSalary)}</td>
                  <td className="px-4 py-3 text-rose-600">- {formatINR(rec.totalDeductions)}</td>
                  <td className="px-4 py-3 font-bold text-[#025085]">{formatINR(rec.netSalary)}</td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-lg px-2.5 py-1 text-[11px] font-bold", statusColor(rec.status))}>{rec.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setPayslipRecord(rec)} title="View Payslip"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#025085] transition-colors">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button onClick={() => { setPayslipRecord(rec); }} title="Download PDF"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#025085] transition-colors">
                        <Download className="h-4 w-4" />
                      </button>
                      {isAdmin && rec.status !== "Paid" && (
                        <button onClick={() => handleMarkPaid(rec.id)} title="Mark as Paid"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                          <BadgeCheck className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRecords.length === 0 && (
            <div className="py-16 text-center text-slate-400">No payroll records available</div>
          )}
        </div>
      </Card>
    </div>
  );

  // ─── Employee: My Salary Tab ───────────────────────────────────────────────

  const MySalary = () => {
    if (!myStructure) return (
      <div className="py-16 text-center text-slate-400">Salary structure not found. Contact HR.</div>
    );
    const gross = myStructure.basicSalary + myStructure.hra + myStructure.transportAllowance + myStructure.medicalAllowance + myStructure.specialAllowance + myStructure.bonus + myStructure.incentives;
    const ded = myStructure.pfDeduction + myStructure.professionalTax + myStructure.incomeTax + myStructure.otherDeductions;
    const net = Math.max(0, gross - ded);

    return (
      <div className="flex flex-col gap-6 max-w-3xl">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Gross Salary", value: formatINR(gross), color: "text-emerald-700", bg: "bg-emerald-50" },
            { label: "Total Deductions", value: formatINR(ded), color: "text-rose-600", bg: "bg-rose-50" },
            { label: "Net Salary", value: formatINR(net), color: "text-[#025085]", bg: "bg-blue-50", bold: true },
          ].map(c => (
            <div key={c.label} className={`rounded-2xl ${c.bg} p-5`}>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{c.label}</div>
              <div className={`text-2xl font-extrabold ${c.color}`}>{c.value}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-bold text-emerald-700">
              <TrendingUp className="h-4 w-4" /> Earnings Breakdown
            </div>
            <div className="flex flex-col gap-2.5">
              {[
                ["Basic Salary", myStructure.basicSalary],
                ["HRA", myStructure.hra],
                ["Transport Allowance", myStructure.transportAllowance],
                ["Medical Allowance", myStructure.medicalAllowance],
                ["Special Allowance", myStructure.specialAllowance],
                ...(myStructure.bonus > 0 ? [["Bonus", myStructure.bonus]] : []),
                ...(myStructure.incentives > 0 ? [["Incentives", myStructure.incentives]] : []),
              ].map(([label, val]) => (
                <div key={label as string} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{label}</span>
                  <span className="font-semibold text-slate-900">{formatINR(val as number)}</span>
                </div>
              ))}
              <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-sm font-bold">
                <span className="text-emerald-700">Gross Total</span>
                <span className="text-emerald-700">{formatINR(gross)}</span>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-bold text-rose-600">
              <AlertCircle className="h-4 w-4" /> Deductions Breakdown
            </div>
            <div className="flex flex-col gap-2.5">
              {[
                ["Provident Fund (12%)", myStructure.pfDeduction],
                ["Professional Tax", myStructure.professionalTax],
                ...(myStructure.incomeTax > 0 ? [["Income Tax (TDS)", myStructure.incomeTax]] : []),
                ...(myStructure.otherDeductions > 0 ? [["Other Deductions", myStructure.otherDeductions]] : []),
              ].map(([label, val]) => (
                <div key={label as string} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{label}</span>
                  <span className="font-semibold text-rose-600">- {formatINR(val as number)}</span>
                </div>
              ))}
              <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-sm font-bold">
                <span className="text-rose-600">Total Deductions</span>
                <span className="text-rose-600">- {formatINR(ded)}</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="rounded-2xl bg-gradient-to-r from-[#025085] to-[#E81D3B] p-5 text-white">
          <div className="text-xs font-bold uppercase tracking-wider text-white/70">Monthly Take-Home (Net Salary)</div>
          <div className="mt-2 text-4xl font-extrabold">{formatINR(net)}</div>
          <div className="mt-1 text-sm text-white/70">Effective from {myStructure.effectiveFrom}</div>
        </div>
      </div>
    );
  };

  // ─── Employee: My Payslips Tab ─────────────────────────────────────────────

  const MyPayslips = () => (
    <div className="flex flex-col gap-4">
      {myRecords.length === 0 ? (
        <div className="py-16 text-center text-slate-400">No payslips available yet.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {myRecords.map(rec => (
            <Card key={rec.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <div className="font-bold text-slate-900">{rec.monthLabel}</div>
                  <span className={cn("mt-1 inline-block rounded-lg px-2.5 py-0.5 text-[11px] font-bold", statusColor(rec.status))}>{rec.status}</span>
                </div>
                <Banknote className="h-8 w-8 text-[#025085]/20" />
              </div>
              <div className="mb-3 space-y-1.5">
                <div className="flex justify-between text-sm"><span className="text-slate-500">Gross</span><span className="font-semibold text-emerald-700">{formatINR(rec.grossSalary)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Deductions</span><span className="text-rose-600">- {formatINR(rec.totalDeductions)}</span></div>
                <div className="flex justify-between border-t border-slate-100 pt-1.5 text-sm font-bold"><span className="text-slate-900">Net Pay</span><span className="text-[#025085]">{formatINR(rec.netSalary)}</span></div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" leftIcon={<Eye className="h-3.5 w-3.5" />} onClick={() => setPayslipRecord(rec)}>View</Button>
                <Button size="sm" variant="secondary" className="flex-1" leftIcon={<Download className="h-3.5 w-3.5" />} onClick={() => setPayslipRecord(rec)}>Download</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // ─── Tab Config ─────────────────────────────────────────────────────────────

  const adminTabs = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "salary-setup", label: "Salary Setup", icon: Calculator },
    { id: "payslips", label: "Payslips", icon: FileText },
  ];

  const employeeTabs = [
    { id: "my-salary", label: "My Salary", icon: IndianRupee },
    { id: "my-payslips", label: "My Payslips", icon: FileText },
  ];

  const tabs = isAdmin ? adminTabs : employeeTabs;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Payroll Management</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {isAdmin
              ? `Manage salary structures, run payroll, and view payslips — ${records.length} records`
              : `View your salary details and download payslips`
            }
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={() => setShowRunPayroll(true)}
            >
              Run Payroll
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-all",
                tab === t.id
                  ? "bg-white text-[#025085] shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {tab === "dashboard" && isAdmin && <AdminDashboard />}
      {tab === "salary-setup" && isAdmin && <SalarySetup />}
      {tab === "payslips" && <PayslipsTab />}
      {tab === "my-salary" && !isAdmin && <MySalary />}
      {tab === "my-payslips" && !isAdmin && <MyPayslips />}

      {/* Modals */}
      {payslipRecord && <PayslipModal record={payslipRecord} onClose={() => setPayslipRecord(null)} />}
      {editStructure && (
        <SalaryStructureModal
          structure={editStructure}
          onSave={handleSaveStructure}
          onClose={() => setEditStructure(null)}
        />
      )}
      {showRunPayroll && (
        <RunPayrollModal
          structures={structures}
          existingRecords={records}
          onRun={handleRunPayroll}
          onClose={() => setShowRunPayroll(false)}
          processedBy={currentUser.name}
        />
      )}
    </div>
  );
}
