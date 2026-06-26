import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight, Sparkles, UserCheck } from "lucide-react";
import { BrandLogo, Button, Input } from "../components/ui";
import { type SyncedEmployee, validatePassword } from "../data/store";

export function Login({ onLogin }: { onLogin: (user: SyncedEmployee) => void }) {
  const [showPwd, setShowPwd] = useState(false);
  const [view, setView] = useState<"login" | "forgot" | "change">("login");
  const [email, setEmail] = useState("admin@tisnx.com");
  const [password, setPassword] = useState("Password123!");
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Look up in localStorage hrms_store_employees
    const storedEmps = localStorage.getItem("hrms_store_employees");
    if (!storedEmps) {
      setError("System database not initialized. Please refresh page.");
      return;
    }

    try {
      const emps: SyncedEmployee[] = JSON.parse(storedEmps);
      let matched = emps.find(emp => emp.email.toLowerCase() === email.trim().toLowerCase());
      if (!matched && email.trim().toLowerCase() === "admin@tisnx.com" && password === "Password123!") {
        matched = {
          id: "EMP-ADMIN",
          empCode: "TISNX-ADMIN",
          name: "System Admin",
          email: "admin@tisnx.com",
          phone: "+91 99999 99999",
          avatar: "",
          department: "Management",
          designation: "Administrator",
          role: "Admin",
          status: "Active",
          joinDate: new Date().toISOString().split("T")[0],
          location: "Remote",
          salary: 0,
          password: "Password123!"
        };
      }
      if (matched) {
        if (matched.status === "Inactive") {
          setError("This account is currently deactivated. Contact Admin.");
          return;
        }
        
        const storedPwd = matched.password || "Password123!";
        if (password !== storedPwd) {
          setError("Invalid password. Please try again.");
          return;
        }

        onLogin(matched);
      } else {
        setError("Invalid email address. Please use a registered work email.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred during sign-in.");
    }
  };

  const handleQuickLogin = (quickEmail: string) => {
    setError("");
    const storedEmps = localStorage.getItem("hrms_store_employees");
    if (storedEmps) {
      try {
        const emps: SyncedEmployee[] = JSON.parse(storedEmps);
        let matched = emps.find(emp => emp.email === quickEmail);
        if (!matched && quickEmail === "admin@tisnx.com") {
          matched = {
            id: "EMP-ADMIN",
            empCode: "TISNX-ADMIN",
            name: "System Admin",
            email: "admin@tisnx.com",
            phone: "+91 99999 99999",
            avatar: "",
            department: "Management",
            designation: "Administrator",
            role: "Admin",
            status: "Active",
            joinDate: new Date().toISOString().split("T")[0],
            location: "Remote",
            salary: 0,
            password: "Password123!"
          };
        }
        if (matched) {
          if (matched.status === "Inactive") {
            setError("This account is currently deactivated. Contact Admin.");
            return;
          }
          onLogin(matched);
        }
      } catch (err) {
        console.error(err);
        setError("An error occurred during quick sign-in.");
      }
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const storedEmps = localStorage.getItem("hrms_store_employees");
    if (!storedEmps) {
      setError("Database not initialized.");
      return;
    }

    const emps: SyncedEmployee[] = JSON.parse(storedEmps);
    const matched = emps.find(emp => emp.email.toLowerCase() === resetEmail.trim().toLowerCase());
    if (!matched) {
      setError("Work email not found in our directory.");
      return;
    }
    if (matched.status === "Inactive") {
      setError("This account is currently deactivated. Contact Admin.");
      return;
    }

    setView("change");
  };

  const handleChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const validationErr = validatePassword(newPassword);
    if (validationErr) {
      setError(validationErr);
      return;
    }

    const storedEmps = localStorage.getItem("hrms_store_employees");
    if (!storedEmps) {
      setError("Database not initialized.");
      return;
    }

    try {
      const emps: SyncedEmployee[] = JSON.parse(storedEmps);
      const updated = emps.map(emp => {
        if (emp.email.toLowerCase() === resetEmail.trim().toLowerCase()) {
          return { ...emp, password: newPassword };
        }
        return emp;
      });
      localStorage.setItem("hrms_store_employees", JSON.stringify(updated));
      window.dispatchEvent(new Event("storage-sync"));

      alert("Password updated successfully. Please login with your new password.");
      setView("login");
      setEmail(resetEmail);
      setPassword(newPassword);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error(err);
      setError("An error occurred while updating the password.");
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-indigo-500 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-violet-500 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-500 blur-3xl opacity-50" />
        </div>
        {/* Floating mock UI cards */}
        <div className="pointer-events-none absolute right-12 top-32 hidden xl:block">
          <div className="float w-64 rotate-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-400 to-violet-500" />
              <div>
                <div className="text-[10px] font-bold text-white/90">System Admin</div>
                <div className="text-[9px] text-indigo-200/70">Checked in · 09:00 AM</div>
              </div>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/10">
              <div className="h-1.5 w-3/4 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400" />
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-32 right-20 hidden xl:block">
          <div className="float w-56 -rotate-2 rounded-2xl border border-white/10 bg-white/5 p-3 shadow-2xl backdrop-blur" style={{ animationDelay: "1s" }}>
            <div className="text-[9px] font-bold uppercase tracking-wider text-indigo-200/80">Productivity</div>
            <div className="mt-1 font-display text-2xl font-extrabold">94%</div>
            <div className="text-[9px] text-emerald-300">↑ 5.2% this quarter</div>
          </div>
        </div>
        <div className="relative">
          <BrandLogo onDark />
        </div>
        <div className="relative space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-indigo-100 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>Trusted by 100+ companies across India</span>
          </div>
          <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Your workforce,<br />
            <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">beautifully managed.</span>
          </h1>
          <p className="max-w-md text-base text-indigo-100/80">
            The Employee Management System built for modern teams. Onboard, manage attendance, approve leave and unlock insights — all from one premium workspace.
          </p>
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { v: (() => {
                try {
                  const stored = localStorage.getItem("hrms_store_employees");
                  return stored ? String(JSON.parse(stored).length) : "0";
                } catch {
                  return "0";
                }
              })(), l: "Employees" },
              { v: "8", l: "Departments" },
              { v: "99.9%", l: "Uptime" },
            ].map(s => (
              <div key={s.l} className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
                <div className="font-display text-2xl font-extrabold">{s.v}</div>
                <div className="text-[11px] uppercase tracking-wider text-indigo-200/80">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative flex items-center gap-3 text-xs text-indigo-200/80">
          <ShieldCheck className="h-4 w-4" />
          <span>SOC 2 · GDPR · ISO 27001 Compliant</span>
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center bg-slate-50 p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <BrandLogo />
          </div>
          {view === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-6">
              <div>
                <h2 className="font-display text-3xl font-extrabold tracking-tight text-slate-900">Welcome back</h2>
                <p className="mt-1.5 text-sm text-slate-500">Sign in to your TIS Nexus employee portal</p>
              </div>

              {error && (
                <div className="rounded-xl bg-rose-50 border border-rose-100 p-3.5 text-xs font-semibold text-rose-700">
                  ⚠️ {error}
                </div>
              )}

              <div className="space-y-4">
                <Input 
                  label="Work Email" 
                  type="email" 
                  placeholder="you@tisnx.com" 
                  leftIcon={<Mail className="h-4 w-4" />} 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <div>
                 <Input 
                    label="Password" 
                    type={showPwd ? "text" : "password"} 
                    placeholder="Enter your password" 
                    leftIcon={<Lock className="h-4 w-4" />} 
                    rightIcon={
                      <button type="button" onClick={() => setShowPwd(s => !s)} className="pointer-events-auto">
                        {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    } 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                      <input type="checkbox" defaultChecked className="rounded border-slate-300" />
                      Remember me for 30 days
                    </label>
                    <button type="button" onClick={() => { setError(""); setView("forgot"); }} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">Forgot password?</button>
                  </div>
                </div>

                <Button type="submit" variant="gradient" size="lg" className="w-full" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  Sign in to dashboard
                </Button>

                <div className="relative my-4 flex items-center gap-3 text-[10px] uppercase tracking-wider text-slate-400">
                  <span className="flex-1 border-t border-slate-200" /> Quick Account Switcher <span className="flex-1 border-t border-slate-200" />
                </div>

                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin("admin@tisnx.com")}
                    className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-2.5 text-center transition-all hover:border-indigo-300 hover:bg-slate-50 w-full"
                  >
                    <UserCheck className="h-4.5 w-4.5 text-indigo-600 mb-1" />
                    <span className="text-[10px] font-bold text-slate-800 leading-tight">System Admin</span>
                    <span className="text-[8px] text-indigo-600 font-bold uppercase">admin@tisnx.com</span>
                  </button>
                </div>
                <p className="text-center text-[10px] text-slate-400 mt-1">Password: <span className="font-bold text-slate-600">Password123!</span></p>
              </div>
            </form>
          )}
          {view === "forgot" && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <h2 className="font-display text-3xl font-extrabold tracking-tight text-slate-900">Reset password</h2>
                <p className="mt-1.5 text-sm text-slate-500">We'll verify your email and guide you to reset your password</p>
              </div>
              {error && (
                <div className="rounded-xl bg-rose-50 border border-rose-100 p-3.5 text-xs font-semibold text-rose-700">
                  ⚠️ {error}
                </div>
              )}
              <div className="space-y-4">
                <Input 
                  label="Work Email" 
                  type="email" 
                  placeholder="you@tisnx.com" 
                  leftIcon={<Mail className="h-4 w-4" />} 
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
                <Button type="submit" variant="gradient" size="lg" className="w-full" rightIcon={<ArrowRight className="h-4 w-4" />}>Send reset link</Button>
                <p className="text-center text-xs text-slate-500">
                  <button type="button" onClick={() => { setError(""); setView("login"); }} className="font-semibold text-indigo-600 hover:text-indigo-700">← Back to sign in</button>
                </p>
              </div>
            </form>
          )}
          {view === "change" && (
            <form onSubmit={handleChangeSubmit} className="space-y-4">
              <div>
                <h2 className="font-display text-3xl font-extrabold tracking-tight text-slate-900">Set new password</h2>
                <p className="mt-1.5 text-sm text-slate-500">Your new password must be different from previous ones</p>
              </div>
              {error && (
                <div className="rounded-xl bg-rose-50 border border-rose-100 p-3.5 text-xs font-semibold text-rose-700">
                  ⚠️ {error}
                </div>
              )}
              <div className="space-y-4">
                <Input 
                  label="New password" 
                  type="password" 
                  leftIcon={<Lock className="h-4 w-4" />} 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <Input 
                  label="Confirm new password" 
                  type="password" 
                  leftIcon={<Lock className="h-4 w-4" />} 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                  <div className="font-semibold text-slate-700">Password requirements</div>
                  <ul className="mt-1.5 space-y-1 text-slate-500">
                    <li>✓ At least 8 characters</li>
                    <li>✓ One uppercase letter</li>
                    <li>✓ One number or symbol</li>
                  </ul>
                </div>
                <Button type="submit" variant="gradient" size="lg" className="w-full" rightIcon={<ArrowRight className="h-4 w-4" />}>Update password</Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
