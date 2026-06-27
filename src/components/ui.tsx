import { memo, ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "../utils/cn";
import logoUrl from "../../logo.webp";

/* ----------------------------- Brand Logo ----------------------------- */
export function BrandLogo({ className = "", compact = false, onDark = false }: { className?: string; compact?: boolean; onDark?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative h-9 w-9 shrink-0">
        <img
          src={logoUrl}
          alt="TIS Nexus Logo"
          className="h-full w-full rounded-xl object-cover shadow-lg shadow-indigo-500/10"
        />
        <div className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white pulse-dot" />
      </div>
      {!compact && (
        <div className="flex flex-col leading-none">
          <span className="font-display text-[15px] font-extrabold tracking-tight">
            <span className={onDark ? "text-rose-400" : "text-rose-600"}>TIS</span>
            <span className={onDark ? "text-white" : "text-indigo-500"}> Nexus</span>
          </span>
          <span className={cn(
            "mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
            onDark ? "text-indigo-200/80" : "text-indigo-600"
          )}>
            Employee portal
          </span>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Button ----------------------------- */
type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "soft" | "gradient";
type Size = "sm" | "md" | "lg";

function _Button({
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}) {
  const sizes: Record<Size, string> = {
    sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
    md: "h-10 px-4 text-sm gap-2 rounded-lg",
    lg: "h-12 px-5 text-sm gap-2.5 rounded-lg",
  };
  const variants: Record<Variant, string> = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-600/20",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm",
    ghost: "text-slate-600 hover:bg-slate-100",
    outline: "border border-indigo-200 text-indigo-700 hover:bg-indigo-50",
    danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-sm shadow-rose-600/20",
    soft: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
    gradient: "bg-brand-gradient text-white hover:opacity-95 shadow-lg shadow-indigo-500/30 shine",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-semibold transition-all active:scale-[0.98] disabled:active:scale-100",
        sizes[size],
        variants[variant],
        className
      )}
      {...rest}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}
export const Button = memo(_Button);
_Button.displayName = "Button";

/* ----------------------------- Input ----------------------------- */
export function Input({
  label,
  hint,
  error,
  leftIcon,
  rightIcon,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-slate-700">{label}</label>}
      <div className="relative">
        {leftIcon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            {leftIcon}
          </div>
        )}
        <input
          className={cn(
            "h-10 w-full rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400",
            "transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 focus:outline-none",
            leftIcon && "pl-10",
            rightIcon && "pr-10",
            error && "border-rose-300 focus:border-rose-400 focus:ring-rose-100",
            className
          )}
          {...rest}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
            {rightIcon}
          </div>
        )}
      </div>
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}

/* ----------------------------- Select ----------------------------- */
export function Select({
  label,
  hint,
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-slate-700">{label}</label>}
      <select
        className={cn(
          "h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900",
          "transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 focus:outline-none",
          "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2364748b%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22/></svg>')] bg-[right_0.85rem_center] bg-no-repeat pr-9",
          className
        )}
        {...rest}
      >
        {children}
      </select>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

/* ----------------------------- Textarea ----------------------------- */
export function Textarea({
  label,
  hint,
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-slate-700">{label}</label>}
      <textarea
        className={cn(
          "min-h-[88px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400",
          "transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 focus:outline-none",
          className
        )}
        {...rest}
      />
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

/* ----------------------------- Card ----------------------------- */
export const Card = memo(function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:shadow-md",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
});

export const CardHeader = memo(function CardHeader({ title, subtitle, action, className }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4", className)}>
      <div>
        <div className="font-display text-base font-bold text-slate-900">{title}</div>
        {subtitle && <div className="mt-0.5 text-xs text-slate-500">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
});

/* ----------------------------- Badge ----------------------------- */
export const Badge = memo(function Badge({
  children,
  variant = "neutral",
  className,
  dot = false,
}: {
  children: ReactNode;
  variant?: "neutral" | "success" | "warning" | "danger" | "info" | "violet" | "indigo";
  className?: string;
  dot?: boolean;
}) {
  const map = {
    neutral: "bg-slate-100 text-slate-700",
    success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60",
    warning: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60",
    danger: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60",
    info: "bg-sky-50 text-sky-700 ring-1 ring-sky-200/60",
    violet: "bg-violet-50 text-violet-700 ring-1 ring-violet-200/60",
    indigo: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/60",
  };
  const dotMap = {
    neutral: "bg-slate-500",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
    info: "bg-sky-500",
    violet: "bg-violet-500",
    indigo: "bg-indigo-500",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", map[variant], className)}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotMap[variant])} />}
      {children}
    </span>
  );
});

/* ----------------------------- Avatar ----------------------------- */
export const Avatar = memo(function Avatar({ src, name, size = 36, className }: { src?: string; name?: string; size?: number; className?: string }) {
  const safeName = name || "Unknown";
  const initials = safeName.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
  const fontSize = Math.max(10, Math.round(size * 0.36));
  if (src) {
    return (
      <img
        src={src}
        alt={safeName}
        style={{ width: size, height: size }}
        className={cn("rounded-full object-cover ring-2 ring-white shadow-sm", className)}
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize }}
      className={cn(
        "flex items-center justify-center rounded-full bg-brand-gradient font-bold text-white ring-2 ring-white shadow-sm",
        className
      )}
    >
      {initials}
    </div>
  );
});

/* ----------------------------- Stat Card ----------------------------- */
export const StatCard = memo(function StatCard({
  label,
  value,
  delta,
  deltaTone = "up",
  icon,
  accent = "indigo",
  spark,
}: {
  label: string;
  value: ReactNode;
  delta?: string;
  deltaTone?: "up" | "down" | "flat";
  icon?: ReactNode;
  accent?: "indigo" | "violet" | "emerald" | "amber" | "rose" | "sky";
  spark?: ReactNode;
}) {
  const accentMap = {
    indigo: "from-indigo-500 to-violet-600",
    violet: "from-violet-500 to-fuchsia-600",
    emerald: "from-emerald-500 to-teal-600",
    amber: "from-amber-500 to-orange-600",
    rose: "from-rose-500 to-pink-600",
    sky: "from-sky-500 to-cyan-600",
  };
  const toneMap = {
    up: "text-emerald-700 bg-emerald-50",
    down: "text-rose-700 bg-rose-50",
    flat: "text-slate-600 bg-slate-100",
  };
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_16px_-8px_rgba(15,23,42,0.06)] transition-all hover:shadow-[0_4px_24px_-6px_rgba(99,102,241,0.18)] hover:border-indigo-200/80">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-50 to-violet-50 opacity-60 blur-2xl transition-opacity group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</span>
          <span className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-900">{value}</span>
        </div>
        {icon && (
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg shadow-indigo-500/20", accentMap[accent])}>
            {icon}
          </div>
        )}
      </div>
      <div className="relative mt-4 flex items-end justify-between">
        {delta ? (
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", toneMap[deltaTone])}>
            {deltaTone === "up" && "↑"}
            {deltaTone === "down" && "↓"}
            {delta}
          </span>
        ) : <span />}
        {spark}
      </div>
    </div>
  );
});

/* ----------------------------- Tabs ----------------------------- */
export function Tabs({
  value,
  onChange,
  items,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  items: { value: string; label: ReactNode; count?: number }[];
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1", className)}>
      {items.map((it) => (
        <button
          key={it.value}
          onClick={() => onChange(it.value)}
          className={cn(
            "inline-flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-all",
            value === it.value
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          {it.label}
          {typeof it.count === "number" && (
            <span className={cn(
              "rounded-md px-1.5 py-0.5 text-[10px] font-bold",
              value === it.value ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"
            )}>
              {it.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ----------------------------- Page Header ----------------------------- */
export function PageHeader({
  title,
  subtitle,
  breadcrumb,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  breadcrumb?: { label: string; href?: string }[];
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {breadcrumb && (
          <div className="mb-2 flex items-center gap-1.5 text-xs text-slate-500">
            {breadcrumb.map((b, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                {i > 0 && <span className="text-slate-300">/</span>}
                <span className={cn(i === breadcrumb.length - 1 ? "font-semibold text-slate-700" : "hover:text-indigo-600")}>{b.label}</span>
              </span>
            ))}
          </div>
        )}
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ----------------------------- Empty State ----------------------------- */
export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">{icon}</div>
      <h3 className="font-display text-base font-bold text-slate-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ----------------------------- Progress Bar ----------------------------- */
export const Progress = memo(function Progress({ value, className, tone = "indigo" }: { value: number; className?: string; tone?: "indigo" | "emerald" | "amber" | "rose" }) {
  const map = {
    indigo: "bg-gradient-to-r from-indigo-500 to-violet-500",
    emerald: "bg-gradient-to-r from-emerald-500 to-teal-500",
    amber: "bg-gradient-to-r from-amber-500 to-orange-500",
    rose: "bg-gradient-to-r from-rose-500 to-pink-500",
  };
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-slate-100", className)}>
      <div className={cn("h-full rounded-full transition-all", map[tone])} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
});

/* ----------------------------- Toggle ----------------------------- */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2.5">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5.5 w-10 rounded-full border border-transparent transition-colors",
          checked ? "bg-indigo-600" : "bg-slate-200"
        )}
        style={{ width: 40, height: 22 }}
      >
        <span
          className={cn(
            "absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-all",
            checked ? "left-[20px]" : "left-0.5"
          )}
        />
      </button>
      {label && <span className="text-sm text-slate-700">{label}</span>}
    </label>
  );
}

/* ----------------------------- Section Title ----------------------------- */
export function SectionTitle({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-lg font-extrabold tracking-tight text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ----------------------------- Confirm Modal ----------------------------- */
export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "primary" | "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onCancel} />
      <div className="relative w-full max-w-md overflow-hidden rounded-xl bg-white p-6 shadow-md animate-in zoom-in-95 duration-200">
        <h3 className="font-display text-lg font-extrabold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-500 leading-normal">{message}</p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="secondary" size="md" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={variant === "danger" ? "danger" : "primary"} size="md" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

