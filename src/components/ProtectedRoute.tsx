import React from "react";
import { useUser } from "../hooks/useUser";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">TIS Nexus HRM</p>
            <p className="text-xs text-slate-400 mt-0.5">Checking authentication…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <>{fallback || null}</>;
  }

  return <>{children}</>;
}
