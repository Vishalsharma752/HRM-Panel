import { NextResponse } from "next/server";
import { getAuthUser, isAuthorized } from "../../../../lib/auth";
import { getServiceClient } from "../../../../lib/supabase";
import { sendEmail } from "../../../../lib/resend";

export async function POST(req: Request) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser || !isAuthorized(authUser, ["Founder", "Cofounder"])) {
      return NextResponse.json({ error: "Forbidden: Administrative access required" }, { status: 403 });
    }

    const body = await req.json();
    const { title, message } = body;

    if (!title || !message) {
      return NextResponse.json({ error: "Missing required fields: title, message" }, { status: 400 });
    }

    const service = getServiceClient();

    // 1. Fetch all active employee email addresses
    const { data: employees, error: fetchErr } = await service
      .from("employees")
      .select("id, official_email, full_name")
      .eq("status", "Active");

    if (fetchErr) {
      console.error("[Announcement Broadcast] Error fetching employees:", fetchErr.message);
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!employees || employees.length === 0) {
      return NextResponse.json({ error: "No active employees found to broadcast" }, { status: 400 });
    }

    const emails = employees.map(e => e.official_email).filter(Boolean);

    // Resolve author database ID from authenticated email
    const { data: author } = await service
      .from("employees")
      .select("id")
      .ilike("official_email", authUser.email)
      .maybeSingle();

    // 2. Insert announcement into database
    const { error: insertErr } = await service
      .from("announcements")
      .insert([{
        title,
        message,
        created_by: author?.id || null
      }]);

    if (insertErr) {
      console.warn("[Announcement Broadcast] Failed to save announcement to database:", insertErr.message);
    }

    // 3. Send email broadcast via Resend helper
    const emailHtml = `
      <div style="font-family: sans-serif; padding: 24px; color: #333; line-height: 1.6; max-width: 600px; border: 1px solid #e5e7eb; border-radius: 12px; margin: 0 auto;">
        <h2 style="color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-top: 0;">
          Company Announcement
        </h2>
        <h3 style="font-size: 16px; margin: 16px 0 8px 0; color: #111827;">${title}</h3>
        <div style="white-space: pre-wrap; color: #4b5563; background-color: #f9fafb; padding: 16px; border-radius: 8px;">${message}</div>
        <p style="font-size: 11px; color: #9ca3af; margin-top: 24px;">This is a broadcast announcement sent to all active employees.</p>
      </div>
    `;

    const { error: emailErr } = await sendEmail({
      to: emails,
      subject: `Announcement: ${title}`,
      html: emailHtml
    });

    if (emailErr) {
      console.error("[Announcement Broadcast] Send failure:", emailErr);
      return NextResponse.json({ error: "Broadcast failed", details: emailErr }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: emails.length });
  } catch (error: any) {
    console.error("[Announcement Broadcast] Exception:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
