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

    return NextResponse.json({ success: true, employee: newEmp });
  } catch (error: any) {
    console.error("[Employees Create] Server Exception:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
