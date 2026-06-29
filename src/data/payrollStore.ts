import { employees } from "./employees";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface SalaryStructure {
  empId: string;
  empName: string;
  department: string;
  designation: string;
  // Earnings
  basicSalary: number;
  hra: number;
  transportAllowance: number;
  medicalAllowance: number;
  specialAllowance: number;
  bonus: number;
  incentives: number;
  // Deductions
  pfDeduction: number;
  professionalTax: number;
  incomeTax: number;
  otherDeductions: number;
  // Overtime
  overtimeRatePerHour: number;
  // Meta
  effectiveFrom: string;
  createdBy: string;
  updatedAt: string;
}

export interface PayrollRecord {
  id: string;
  empId: string;
  empName: string;
  email?: string;
  department: string;
  designation: string;
  avatar?: string;
  month: string;
  monthLabel: string;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  overtimeHours: number;
  basicSalary: number;
  hra: number;
  transportAllowance: number;
  medicalAllowance: number;
  specialAllowance: number;
  bonus: number;
  incentives: number;
  overtimePay: number;
  grossSalary: number;
  pfDeduction: number;
  professionalTax: number;
  incomeTax: number;
  unpaidLeaveDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  status: "Draft" | "Processed" | "Paid" | "On Hold";
  processedBy?: string;
  processedAt?: string;
  paidAt?: string;
  paymentMode?: "Bank Transfer" | "Cheque" | "Cash";
  remarks?: string;
}

// ─── Calculation Helpers ────────────────────────────────────────────────────

export function computePayroll(
  structure: SalaryStructure,
  workingDays: number,
  presentDays: number,
  absentDays: number,
  paidLeaveDays: number,
  unpaidLeaveDays: number,
  overtimeHours: number
) {
  const perDaySalary = structure.basicSalary / workingDays;
  const unpaidLeaveDeduction = Math.round(perDaySalary * unpaidLeaveDays);
  const overtimePay = Math.round(overtimeHours * (perDaySalary / 8));

  const grossSalary = Math.round(
    structure.basicSalary +
    structure.hra +
    structure.transportAllowance +
    structure.medicalAllowance +
    structure.specialAllowance +
    structure.bonus +
    structure.incentives +
    overtimePay
  );

  const totalDeductions = Math.round(
    structure.pfDeduction +
    structure.professionalTax +
    structure.incomeTax +
    structure.otherDeductions +
    unpaidLeaveDeduction
  );

  const netSalary = Math.max(0, grossSalary - totalDeductions);

  return {
    workingDays, presentDays, absentDays, paidLeaveDays, unpaidLeaveDays, overtimeHours,
    basicSalary: structure.basicSalary,
    hra: structure.hra,
    transportAllowance: structure.transportAllowance,
    medicalAllowance: structure.medicalAllowance,
    specialAllowance: structure.specialAllowance,
    bonus: structure.bonus,
    incentives: structure.incentives,
    overtimePay,
    grossSalary,
    pfDeduction: structure.pfDeduction,
    professionalTax: structure.professionalTax,
    incomeTax: structure.incomeTax,
    unpaidLeaveDeduction,
    otherDeductions: structure.otherDeductions,
    totalDeductions,
    netSalary,
  };
}

export function formatMonthLabel(yyyyMM: string): string {
  const [y, m] = yyyyMM.split("-");
  const d = new Date(parseInt(y), parseInt(m) - 1, 1);
  return d.toLocaleString("en-IN", { month: "long", year: "numeric" });
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Seed Data ──────────────────────────────────────────────────────────────

export function makeSalaryStructure(
  emp: { id: string; name: string; department: string; designation: string; salary?: number },
  createdBy: string
): SalaryStructure {
  const annual = emp.salary || 600000;
  const monthly = Math.round(annual / 12);
  const basic = Math.round(monthly * 0.50);
  const hra = Math.round(monthly * 0.20);
  const transport = Math.round(monthly * 0.05);
  const medical = Math.round(monthly * 0.03);
  const special = Math.max(0, monthly - basic - hra - transport - medical);
  const pf = Math.round(basic * 0.12);
  const pt = monthly > 25000 ? 200 : 150;
  const it = annual > 700000 ? Math.round((annual * 0.10) / 12) : 0;

  return {
    empId: emp.id,
    empName: emp.name,
    department: emp.department,
    designation: emp.designation,
    basicSalary: basic,
    hra,
    transportAllowance: transport,
    medicalAllowance: medical,
    specialAllowance: special,
    bonus: 0,
    incentives: 0,
    pfDeduction: pf,
    professionalTax: pt,
    incomeTax: it,
    otherDeductions: 0,
    overtimeRatePerHour: Math.max(100, Math.round(basic / 26 / 8)),
    effectiveFrom: "2025-01",
    createdBy,
    updatedAt: new Date().toISOString(),
  };
}

export function generateHistoricalPayroll(): PayrollRecord[] {
  const records: PayrollRecord[] = [];
  const months = ["2026-03", "2026-04", "2026-05"];
  const monthLabels = ["March 2026", "April 2026", "May 2026"];
  const sampleEmployees = employees.slice(0, 14);

  months.forEach((month, mi) => {
    sampleEmployees.forEach((emp) => {
      const annual = emp.salary || 600000;
      const monthly = Math.round(annual / 12);
      const basic = Math.round(monthly * 0.50);
      const hra = Math.round(monthly * 0.20);
      const transport = Math.round(monthly * 0.05);
      const medical = Math.round(monthly * 0.03);
      const special = Math.max(0, monthly - basic - hra - transport - medical);
      const pf = Math.round(basic * 0.12);
      const pt = monthly > 25000 ? 200 : 150;
      const it = annual > 700000 ? Math.round((annual * 0.10) / 12) : 0;

      const workingDays = 26;
      const unpaidLeaveDays = emp.status === "On Leave" && mi === 2 ? 2 : 0;
      const paidLeaveDays = mi % 2 === 0 ? 1 : 0;
      const presentDays = workingDays - unpaidLeaveDays - paidLeaveDays;
      const overtimeHours = mi === 1 ? 4 : 0;

      const perDay = basic / workingDays;
      const unpaidDed = Math.round(perDay * unpaidLeaveDays);
      const otPay = Math.round(overtimeHours * (perDay / 8));

      const gross = Math.round(basic + hra + transport + medical + special + otPay);
      const totalDed = Math.round(pf + pt + it + unpaidDed);
      const net = Math.max(0, gross - totalDed);

      records.push({
        id: `PR-${month}-${emp.id}`,
        empId: emp.id,
        empName: emp.name,
        department: emp.department,
        designation: emp.designation,
        avatar: emp.avatar,
        month,
        monthLabel: monthLabels[mi],
        workingDays,
        presentDays,
        absentDays: 0,
        paidLeaveDays,
        unpaidLeaveDays,
        overtimeHours,
        basicSalary: basic,
        hra,
        transportAllowance: transport,
        medicalAllowance: medical,
        specialAllowance: special,
        bonus: 0,
        incentives: 0,
        overtimePay: otPay,
        grossSalary: gross,
        pfDeduction: pf,
        professionalTax: pt,
        incomeTax: it,
        unpaidLeaveDeduction: unpaidDed,
        otherDeductions: 0,
        totalDeductions: totalDed,
        netSalary: net,
        status: "Paid",
        processedBy: "Navdeep Sharma",
        processedAt: `${month}-25T10:00:00Z`,
        paidAt: `${month}-28T14:00:00Z`,
        paymentMode: "Bank Transfer",
      });
    });
  });

  return records;
}

export const initialSalaryStructures: SalaryStructure[] = [];

export const initialPayrollRecords: PayrollRecord[] = [];

export function getInitialPayrollData() {
  return {
    structures: initialSalaryStructures,
    records: initialPayrollRecords,
  };
}
