import React, { useEffect } from "react";
import { useUser } from "../hooks/useUser";
import type { Role } from "../data/store";

interface RoleGuardProps {
  allowedRoles: Role[];
  fallbackPage?: any; // To support Page type dynamically
  onRedirect?: (page: any) => void;
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, fallbackPage = "dashboard", onRedirect, children }: RoleGuardProps) {
  const { user, isLoading } = useUser();

  const hasAccess = user && allowedRoles.includes(user.role);

  useEffect(() => {
    if (!isLoading && !hasAccess && onRedirect) {
      onRedirect(fallbackPage);
    }
  }, [isLoading, hasAccess, onRedirect, fallbackPage]);

  if (isLoading) {
    return null;
  }

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
}
