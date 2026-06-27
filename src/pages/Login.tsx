import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight, Sparkles, UserCheck, Loader2 } from "lucide-react";
import { BrandLogo, Button, Input } from "../components/ui";
import { validatePassword } from "../data/store";
import { supabase } from "../components/supabase";

interface LoginProps {
  onSignIn: (email: string, password: string) => Promise<void>;
  authLoading: boolean;
  authError: string | null;
  clearAuthError: () => void;
}

export function Login({ onSignIn, authLoading, authError, clearAuthError }: LoginProps) {
  const [showPwd, setShowPwd] = useState(false);
  const [view, setView] = useState<"login" | "forgot" | "change">("login");

  // Login form state
  const [email, setEmail] = useState("admin@tisnx.com");
  const [password, setPassword] = useState("Password123!");

  // Forgot / reset state
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const [localLoading, setLocalLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    setLocalError("");
    if (!email.trim() || !password) {
      setLocalError("Email and password are required.");
      return;
    }
    await onSignIn(email.trim(), password);
  };

  const handleQuickLogin = async (quickEmail: string, quickPassword = "Password123!") => {
    clearAuthError();
    setLocalError("");
    setEmail(quickEmail);
    setPassword(quickPassword);
    await onSignIn(quickEmail, quickPassword);
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    setSuccessMessage("");
    setLocalLoading(true);

    try {
      // Try Supabase Auth password reset email first
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/?reset=true`,
      });

      if (error) {
        // Supabase Auth reset failed — verify email exists in employees table
        const { data, error: dbErr } = await supabase
          .from("employees")
          .select("official_email, status")
          .or(`official_email.ilike.${resetEmail.trim()},email.ilike.${resetEmail.trim()}`)
          .limit(1)
          .maybeSingle();

        if (dbErr || !data) {
          setLocalError("No account found with this email address.");
          setLocalLoading(false);
          return;
        }
        if (data.status === "Inactive") {
          setLocalError("This account has been deactivated. Contact Administrator.");
          setLocalLoading(false);
          return;
        }

        // Email exists in employees table — let them set new password locally
        setView("change");
      } else {
        setSuccessMessage("Password reset email sent. Check your inbox.");
      }
    } catch (ex: any) {
      setLocalError("An error occurred. Please try again.");
    } finally {
      setLocalLoading(false);
    }
  };

  const handleChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    setLocalLoading(true);

    if (newPassword !== confirmPassword) {
      setLocalError("Passwords do not match.");
      setLocalLoading(false);
      return;
    }

    const validationErr = validatePassword(newPassword);
    if (validationErr) {
      setLocalError(validationErr);
      setLocalLoading(false);
      return;
    }

    try {
      // Update in Supabase Auth (for users who have auth accounts)
      const { error: authErr } = await supabase.auth.updateUser({ password: newPassword });
      if (authErr) console.warn("[Login] Auth update failed:", authErr.message);

      // Update in employees table (for all employees)
      const { error: dbErr } = await supabase
        .from("employees")
        .update({ password: newPassword })
        .or(`official_email.ilike.${resetEmail.trim()},email.ilike.${resetEmail.trim()}`);

      if (dbErr) {
        console.error("[Login] DB password update error:", dbErr.message);
        setLocalError(`Database update failed: ${dbErr.message}`);
        setLocalLoading(false);
        return;
      }

      setSuccessMessage("Password updated successfully. Please sign in with your new password.");
      setTimeout(() => {
        setView("login");
        setEmail(resetEmail);
        setPassword(newPassword);
        setNewPassword("");
        setConfirmPassword("");
        setSuccessMessage("");
      }, 2000);
    } catch (ex: any) {
      setLocalError("An error occurred. Please try again.");
    } finally {
      setLocalLoading(false);
    }
  };

  const displayError = authError || localError;
  const isSubmitting = authLoading || localLoading;

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
              { v: "50+", l: "Employees" },
              { v: "8", l: "Departments" },
              { v: "99.9%", l: "Uptime" },
            ].map((s) => (
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

          {/* ── LOGIN VIEW ── */}
          {view === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-6">
              <div>
                <h2 className="font-display text-3xl font-extrabold tracking-tight text-slate-900">Welcome back</h2>
                <p className="mt-1.5 text-sm text-slate-500">Sign in to your TIS Nexus employee portal</p>
              </div>

              {displayError && (
                <div className="rounded-xl bg-rose-50 border border-rose-100 p-3.5 text-xs font-semibold text-rose-700 flex items-start gap-2">
                  <span className="mt-0.5">⚠️</span>
                  <span>{displayError}</span>
                </div>
              )}

              <div className="space-y-4">
                <Input
                  label="Work Email"
                  type="email"
                  id="login-email"
                  placeholder="you@tisnx.com"
                  leftIcon={<Mail className="h-4 w-4" />}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearAuthError(); setLocalError(""); }}
                  required
                  disabled={isSubmitting}
                />
                <div>
                  <Input
                    label="Password"
                    id="login-password"
                    type={showPwd ? "text" : "password"}
                    placeholder="Enter your password"
                    leftIcon={<Lock className="h-4 w-4" />}
                    rightIcon={
                      <button type="button" onClick={() => setShowPwd((s) => !s)} className="pointer-events-auto" tabIndex={-1}>
                        {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearAuthError(); setLocalError(""); }}
                    required
                    disabled={isSubmitting}
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                      <input type="checkbox" defaultChecked className="rounded border-slate-300" />
                      Remember me for 30 days
                    </label>
                    <button
                      type="button"
                      onClick={() => { clearAuthError(); setLocalError(""); setView("forgot"); }}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                      disabled={isSubmitting}
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="gradient"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting}
                  rightIcon={isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                >
                  {isSubmitting ? "Signing in…" : "Sign in to dashboard"}
                </Button>

                <div className="relative my-4 flex items-center gap-3 text-[10px] uppercase tracking-wider text-slate-400">
                  <span className="flex-1 border-t border-slate-200" /> Quick Account Switcher <span className="flex-1 border-t border-slate-200" />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Admin", email: "admin@tisnx.com", color: "indigo" },
                    { label: "Manager", email: "vikram@tisnx.com", color: "emerald" },
                    { label: "Employee", email: "rohan@tisnx.com", color: "amber" },
                  ].map(({ label, email: qEmail, color }) => (
                    <button
                      key={qEmail}
                      type="button"
                      onClick={() => handleQuickLogin(qEmail)}
                      disabled={isSubmitting}
                      className={`flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-center transition-all hover:border-${color}-300 hover:bg-slate-50 w-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <UserCheck className={`h-4 w-4 text-${color}-600 mb-1`} />
                      <span className="text-[10px] font-bold text-slate-800 leading-tight">{label}</span>
                      <span className={`text-[8px] text-${color}-600 font-bold uppercase truncate w-full px-1`}>{qEmail}</span>
                    </button>
                  ))}
                </div>
                <p className="text-center text-[10px] text-slate-400 mt-1">
                  Default Password: <span className="font-bold text-slate-600">Password123!</span>
                </p>
              </div>
            </form>
          )}

          {/* ── FORGOT VIEW ── */}
          {view === "forgot" && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <h2 className="font-display text-3xl font-extrabold tracking-tight text-slate-900">Reset password</h2>
                <p className="mt-1.5 text-sm text-slate-500">We'll verify your email and send reset instructions</p>
              </div>
              {displayError && (
                <div className="rounded-xl bg-rose-50 border border-rose-100 p-3.5 text-xs font-semibold text-rose-700">⚠️ {displayError}</div>
              )}
              {successMessage && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3.5 text-xs font-semibold text-emerald-700">✓ {successMessage}</div>
              )}
              <div className="space-y-4">
                <Input
                  label="Work Email"
                  type="email"
                  id="forgot-email"
                  placeholder="you@tisnx.com"
                  leftIcon={<Mail className="h-4 w-4" />}
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
                <Button
                  type="submit"
                  variant="gradient"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting}
                  rightIcon={isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                >
                  {isSubmitting ? "Sending…" : "Send reset link"}
                </Button>
                <p className="text-center text-xs text-slate-500">
                  <button
                    type="button"
                    onClick={() => { setLocalError(""); clearAuthError(); setView("login"); }}
                    className="font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    ← Back to sign in
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ── CHANGE PASSWORD VIEW ── */}
          {view === "change" && (
            <form onSubmit={handleChangeSubmit} className="space-y-4">
              <div>
                <h2 className="font-display text-3xl font-extrabold tracking-tight text-slate-900">Set new password</h2>
                <p className="mt-1.5 text-sm text-slate-500">Your new password must be different from previous ones</p>
              </div>
              {displayError && (
                <div className="rounded-xl bg-rose-50 border border-rose-100 p-3.5 text-xs font-semibold text-rose-700">⚠️ {displayError}</div>
              )}
              {successMessage && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3.5 text-xs font-semibold text-emerald-700">✓ {successMessage}</div>
              )}
              <div className="space-y-4">
                <Input
                  label="New password"
                  type="password"
                  id="new-password"
                  leftIcon={<Lock className="h-4 w-4" />}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
                <Input
                  label="Confirm new password"
                  type="password"
                  id="confirm-password"
                  leftIcon={<Lock className="h-4 w-4" />}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                  <div className="font-semibold text-slate-700">Password requirements</div>
                  <ul className="mt-1.5 space-y-1 text-slate-500">
                    <li className={newPassword.length >= 8 ? "text-emerald-600" : ""}>✓ At least 8 characters</li>
                    <li className={/[A-Z]/.test(newPassword) ? "text-emerald-600" : ""}>✓ One uppercase letter</li>
                    <li className={/[0-9\W]/.test(newPassword) ? "text-emerald-600" : ""}>✓ One number or symbol</li>
                  </ul>
                </div>
                <Button
                  type="submit"
                  variant="gradient"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting}
                  rightIcon={isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                >
                  {isSubmitting ? "Updating…" : "Update password"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
