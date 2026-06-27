import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dnqnwrsmmihogujhcyng.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export async function middleware(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader ? authHeader.replace("Bearer ", "").trim() : undefined;

  // 1. Exclude public paths or trigger schedules (like Birthday scan which uses custom secret keys)
  const isPublicPath = 
    req.nextUrl.pathname.startsWith("/api/emails/birthday-check");
    
  if (isPublicPath) {
    return NextResponse.next();
  }

  // 2. Validate token presence
  if (!token) {
    return NextResponse.json({ error: "Unauthorized: Missing authorization header token" }, { status: 401 });
  }

  try {
    // 3. Verify standard Supabase Auth token
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized: Invalid or expired authorization token" }, { status: 401 });
    }

    // 4. Inject verified user context headers into route requests
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-user-id", user.id);
    requestHeaders.set("x-user-email", user.email || "");

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (err: any) {
    console.error("[Middleware] Auth token check error:", err.message);
    return NextResponse.json({ error: "Internal Server Error in Authorization Gate" }, { status: 500 });
  }
}

export const config = {
  matcher: "/api/:path*",
};
