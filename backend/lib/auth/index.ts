import { createRequestClient, getServiceClient } from "../supabase";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: "Founder" | "Cofounder" | "Employee" | null;
}

export async function getAuthUser(req: Request): Promise<AuthenticatedUser | null> {
  const client = createRequestClient(req);
  
  // 1. Get user from Supabase Auth session token
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) {
    console.warn("[Auth] Failed to authenticate user token:", error?.message);
    return null;
  }
  
  const email = user.email;
  if (!email) return null;
  
  // 2. Fetch normalized role from employees table in database
  const service = getServiceClient();
  const { data: emp, error: dbErr } = await service
    .from("employees")
    .select("role")
    .ilike("official_email", email.trim().toLowerCase())
    .maybeSingle();
    
  if (dbErr) {
    console.error("[Auth] Database role query failed:", dbErr.message);
  }
  
  const rawRole = (emp?.role || "").toLowerCase().trim();
  let role: "Founder" | "Cofounder" | "Employee" = "Employee";
  if (rawRole === "founder") {
    role = "Founder";
  } else if (rawRole === "cofounder" || rawRole === "co-founder") {
    role = "Cofounder";
  }
  
  return {
    id: user.id,
    email,
    role
  };
}

export function isAuthorized(user: AuthenticatedUser | null, allowedRoles: ("Founder" | "Cofounder" | "Employee")[]): boolean {
  if (!user || !user.role) return false;
  return allowedRoles.includes(user.role);
}
