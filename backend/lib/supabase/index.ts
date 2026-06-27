import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dnqnwrsmmihogujhcyng.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Returns a client configured with service-role (if provided) to bypass RLS.
 * Falls back to anon key if service role is not configured.
 */
export function getServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

/**
 * Creates a request-scoped Supabase client that forwards the Bearer JWT token
 * to enforce user-specific RLS policies database-side.
 */
export function createRequestClient(req: Request) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader ? authHeader.replace("Bearer ", "").trim() : undefined;
  
  if (token) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
    });
  }
  
  return supabase;
}
