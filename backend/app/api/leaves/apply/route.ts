import { NextResponse } from "next/server";
import { getAuthUser } from "../../../../lib/auth";
import { getServiceClient } from "../../../../lib/supabase";

export async function POST(req: Request) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, fromDate, toDate, days, reason } = body;

    if (!type || !fromDate || !toDate || !days) {
      return NextResponse.json({ error: "Missing required fields: type, fromDate, toDate, days" }, { status: 400 });
    }

    const service = getServiceClient();

    // Resolve employee DB ID from authenticated user's email
    const { data: emp, error: empErr } = await service
      .from("employees")
      .select("id")
      .ilike("official_email", authUser.email.trim().toLowerCase())
      .maybeSingle();

    if (empErr || !emp) {
      return NextResponse.json({ error: "Employee profile not found in database" }, { status: 404 });
    }

    const { data: newLeave, error: insertError } = await service
      .from("leave_requests")
      .insert([{
        employee_id: emp.id,
        type,
        from_date: fromDate,
        to_date: toDate,
        days: parseInt(String(days), 10),
        reason: reason || "",
        status: "Pending"
      }])
      .select()
      .single();

    if (insertError) {
      console.error("[Leave Apply] Database error:", insertError.message);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, leave: newLeave });
  } catch (error: any) {
    console.error("[Leave Apply] Server Exception:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
