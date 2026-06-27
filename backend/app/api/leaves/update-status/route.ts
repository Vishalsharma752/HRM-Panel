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
    const { leaveId, status } = body;

    if (!leaveId || !status || !["Approved", "Rejected"].includes(status)) {
      return NextResponse.json({ error: "Missing or invalid parameters: leaveId, status" }, { status: 400 });
    }

    const service = getServiceClient();

    // 1. Get the leave request details
    const { data: request, error: queryErr } = await service
      .from("leave_requests")
      .select(`
        *,
        employees (
          id,
          full_name,
          official_email
        )
      `)
      .eq("id", leaveId)
      .maybeSingle();

    if (queryErr || !request) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
    }

    const employee = (request as any).employees;
    if (!employee) {
      return NextResponse.json({ error: "Associated employee profile not found" }, { status: 404 });
    }

    // 2. Update status in leave_requests
    const { error: updateErr } = await service
      .from("leave_requests")
      .update({ status })
      .eq("id", leaveId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 3. Cascading updates if Approved
    if (status === "Approved") {
      const dates: string[] = [];
      const start = new Date(request.from_date);
      const end = new Date(request.to_date);
      const temp = new Date(start);
      while (temp <= end) {
        dates.push(temp.toISOString().split("T")[0]);
        temp.setDate(temp.getDate() + 1);
      }

      // Upsert attendance records
      const upsertRows = dates.map(dStr => ({
        employee_id: employee.id,
        date: dStr,
        check_in: "—",
        check_out: "—",
        status: "On Leave"
      }));
      
      const { error: attendanceErr } = await service
        .from("attendance")
        .upsert(upsertRows, { onConflict: "employee_id, date" });
        
      if (attendanceErr) {
        console.error("[Leave Status Update] Attendance upsert failed:", attendanceErr.message);
      }

      // Update employee status to On Leave
      const { error: empErr } = await service
        .from("employees")
        .update({ status: "On Leave" })
        .eq("id", employee.id);
        
      if (empErr) {
        console.error("[Leave Status Update] Employee status update failed:", empErr.message);
      }
    }

    // 4. Send Email via Resend
    const emailHtml = `
      <div style="font-family: sans-serif; padding: 24px; color: #333; line-height: 1.6;">
        <h3 style="color: ${status === "Approved" ? "#10b981" : "#ef4444"}; font-size: 18px; margin-top: 0;">
          Leave Request ${status}
        </h3>
        <p>Dear ${employee.full_name},</p>
        <p>Your leave request has been reviewed and marked as <strong>${status}</strong>.</p>
        <p><strong>Details:</strong></p>
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Leave Type:</strong> ${request.type}</p>
          <p style="margin: 0 0 8px 0;"><strong>From Date:</strong> ${request.from_date}</p>
          <p style="margin: 0 0 8px 0;"><strong>To Date:</strong> ${request.to_date}</p>
          <p style="margin: 0 0 8px 0;"><strong>Total Days:</strong> ${request.days}</p>
          <p style="margin: 0;"><strong>Reason:</strong> ${request.reason || "N/A"}</p>
        </div>
        <p style="margin-top: 24px;">Best regards,<br/>The HR Operations Team</p>
      </div>
    `;

    const { error: emailErr } = await sendEmail({
      to: employee.official_email,
      subject: `Leave Request Update: ${status}`,
      html: emailHtml
    });

    if (emailErr) {
      console.warn("[Leave Status Update] Notification email failed:", emailErr);
    }

    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    console.error("[Leave Status Update] Server Exception:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export async function PUT(req: Request) { return POST(req); }
