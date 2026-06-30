import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { sendEmail } from "@/lib/resend";

export async function POST(req: Request) {
  try {
    const { email, name, tempPassword } = await req.json();
    if (!email || !name || !tempPassword) {
      return NextResponse.json({ error: "Missing required fields: email, name, and tempPassword are required." }, { status: 400 });
    }

    const supabase = getServiceClient();

    // 1. Create the Auth login account using Supabase Admin Auth API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: name }
    });

    // If user already exists in auth, we ignore and proceed to avoid blocking
    if (authError && !authError.message.includes("already registered")) {
      console.error("Supabase Auth admin createUser error:", authError);
      return NextResponse.json({ error: `Auth account creation failed: ${authError.message}` }, { status: 400 });
    }

    // 2. Construct login URL (dynamically mapping host)
    const loginUrl = `${new URL(req.url).origin.replace("/api/employees/welcome", "")}/`;

    // 3. Send Welcome Email via Resend
    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">TIS Nexus HRM</h2>
        </div>
        <div style="border-top: 2px solid #e2e8f0; padding-top: 24px;">
          <p style="color: #334155; font-size: 16px; margin-bottom: 12px;">Hello ${name},</p>
          <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            Welcome to the team! Your employee account has been created successfully. Here are your portal credentials:
          </p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="color: #64748b; font-size: 13px; font-weight: 600; padding-bottom: 8px; width: 180px;">LOGIN EMAIL:</td>
                <td style="color: #1e293b; font-size: 14px; font-weight: 700; padding-bottom: 8px;">${email}</td>
              </tr>
              <tr>
                <td style="color: #64748b; font-size: 13px; font-weight: 600;">TEMPORARY PASSWORD:</td>
                <td style="color: #1e293b; font-size: 14px; font-weight: 700; font-family: monospace;">${tempPassword}</td>
              </tr>
            </table>
          </div>

          <div style="margin: 28px 0; text-align: center;">
            <a href="${loginUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">Login to Portal</a>
          </div>
          
          <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-top: 24px;">
            Please update your temporary password upon your first successful login from the portal settings page.
          </p>
        </div>
        <div style="margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center;">
          <p style="font-size: 11px; color: #94a3b8; margin: 0;">TIS Nexus HRM Portal &bull; Onboarding Service</p>
        </div>
      </div>
    `;

    const emailResult = await sendEmail({
      to: email.trim(),
      subject: "Welcome to TIS Nexus!",
      html: htmlContent,
      templateType: "Welcome",
    });

    if (emailResult.error) {
      console.error("Welcome email delivery failed:", emailResult.error);
      return NextResponse.json({ error: "Failed to send Welcome email via Resend" }, { status: 500 });
    }

    // 4. Send announcement email to all active employees
    try {
      const { data: allEmps } = await supabase
        .from("employees")
        .select("official_email")
        .eq("status", "Active");

      const activeEmails = allEmps
        ?.map((emp: any) => emp.official_email)
        .filter((e): e is string => !!e && e.toLowerCase() !== email.trim().toLowerCase()) || [];

      if (activeEmails.length > 0) {
        const announcementHtml = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <h2 style="color: #4f46e5; margin-top: 0; font-size: 20px;">New Team Member Announcement! 🚀</h2>
            <p style="color: #334155; font-size: 15px; line-height: 1.6;">Hello Team,</p>
            <p style="color: #475569; font-size: 15px; line-height: 1.6;">
              Please join us in welcoming our newest team member, <strong>${name}</strong>, who has joined TIS Nexus! We are excited to have them on board.
            </p>
            <div style="margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center;">
              <p style="font-size: 11px; color: #94a3b8; margin: 0;">TIS Nexus HRM Portal &bull; Announcements</p>
            </div>
          </div>
        `;

        await sendEmail({
          to: activeEmails,
          subject: `Welcome our new team member, ${name}! 🚀`,
          html: announcementHtml,
          templateType: "NewEmployeeAnnouncement",
        });
      }
    } catch (annError) {
      console.warn("New employee announcement email broadcast failed:", annError);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Welcome employee route error:", err);
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 });
  }
}
