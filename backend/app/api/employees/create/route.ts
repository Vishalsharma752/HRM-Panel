import { NextResponse } from "next/server";
import { getAuthUser, isAuthorized } from "../../../../lib/auth";
import { getServiceClient } from "@/lib/supabase";
import { sendEmail } from "@/lib/resend";

export async function POST(req: Request) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser || !isAuthorized(authUser, ["Founder", "Cofounder"])) {
      return NextResponse.json({ error: "Forbidden: Administrative access required" }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      email,
      role = "employee",
      dob,
      department = "General",
      designation = "Employee",
      phone = "—",
      joinDate = new Date().toISOString().split("T")[0],
      location = "India",
      salary = 0,
      password = "Password123!"
    } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Missing required fields: name, email" }, { status: 400 });
    }

    const service = getServiceClient();

    // 1. Insert into employees table
    const { data: newEmp, error: insertError } = await service
      .from("employees")
      .insert([{
        full_name: name,
        official_email: email,
        role: role,
        dob: dob || null,
        department: department,
        designation: designation,
        mobile: phone,
        doj: joinDate,
        location: location,
        salary: salary,
        password: password,
        status: "Active"
      }])
      .select()
      .single();

    if (insertError) {
      console.error("[Employees Create] Database error:", insertError.message);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 2. Trigger Welcome Email via Resend
    const emailHtml = `
      <div style="font-family: sans-serif; padding: 24px; color: #333; line-height: 1.6;">
        <h2 style="color: #6366f1;">Welcome to the Team, ${name}!</h2>
        <p>Your HR portal account has been created successfully.</p>
        <p>Here are your credentials to log in to the employee dashboard:</p>
        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 0;"><strong>Password:</strong> ${password}</p>
        </div>
        <p style="color: #ef4444; font-size: 12px;">For security purposes, please update your password after logging in for the first time.</p>
        <p style="margin-top: 24px;">Best regards,<br/>The HR Operations Team</p>
      </div>
    `;

    const { error: emailErr } = await sendEmail({
      to: email,
      subject: "Welcome to TIS Nexus - Your HR Account is Ready!",
      html: emailHtml
    });

    if (emailErr) {
      console.warn("[Employees Create] Welcome email delivery failed:", emailErr);
    }

    // 3. Send announcement email to all active employees
    try {
      const { data: allEmps } = await service
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
      console.warn("[Employees Create] New employee announcement email broadcast failed:", annError);
    }

    return NextResponse.json({ success: true, employee: newEmp });
  } catch (error: any) {
    console.error("[Employees Create] Server Exception:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
