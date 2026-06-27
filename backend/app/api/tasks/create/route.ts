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
    const { title, description, assigneeId, priority = "Medium", dueDate } = body;

    if (!title) {
      return NextResponse.json({ error: "Missing required parameter: title" }, { status: 400 });
    }

    const service = getServiceClient();

    // 1. Resolve assignee database ID and profile
    let dbAssigneeId: number | null = null;
    let employeeEmail: string | null = null;
    let employeeName: string | null = null;

    if (assigneeId) {
      const parts = String(assigneeId).split("-");
      const parsedId = parseInt(parts[parts.length - 1] || "", 10);
      
      if (!isNaN(parsedId)) {
        const { data: emp, error: empErr } = await service
          .from("employees")
          .select("id, full_name, official_email")
          .eq("id", parsedId)
          .maybeSingle();
          
        if (emp) {
          dbAssigneeId = emp.id;
          employeeName = emp.full_name;
          employeeEmail = emp.official_email;
        }
      }
    }

    // 2. Insert task record
    const { data: task, error: insertError } = await service
      .from("tasks")
      .insert([{
        title,
        description: description || "",
        assigned_to: dbAssigneeId,
        status: "Pending",
        priority,
        due_date: dueDate || null
      }])
      .select()
      .single();

    if (insertError) {
      console.error("[Tasks Create] Database error:", insertError.message);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 3. Trigger Email Notification (if assignee resolved)
    if (employeeEmail && employeeName) {
      const emailHtml = `
        <div style="font-family: sans-serif; padding: 24px; color: #333; line-height: 1.6;">
          <h2 style="color: #6366f1; font-size: 20px; margin-top: 0;">New Task Assignment</h2>
          <p>Hello ${employeeName},</p>
          <p>You have been assigned a new task: <strong>${title}</strong>.</p>
          <p><strong>Task Details:</strong></p>
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Title:</strong> ${title}</p>
            <p style="margin: 0 0 8px 0;"><strong>Priority:</strong> ${priority}</p>
            <p style="margin: 0 0 8px 0;"><strong>Due Date:</strong> ${dueDate || "Not specified"}</p>
            <p style="margin: 0;"><strong>Description:</strong><br/>${description || "N/A"}</p>
          </div>
          <p style="margin-top: 24px;">Please check your dashboard to start working on the task.</p>
          <p>Best regards,<br/>The Operations Team</p>
        </div>
      `;

      const { error: emailErr } = await sendEmail({
        to: employeeEmail,
        subject: `New Task Assigned: ${title}`,
        html: emailHtml
      });

      if (emailErr) {
        console.warn("[Tasks Create] Notification email failed:", emailErr);
      }
    }

    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    console.error("[Tasks Create] Server Exception:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
