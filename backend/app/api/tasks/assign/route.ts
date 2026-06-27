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
    const { taskId, assigneeId } = body;

    if (!taskId) {
      return NextResponse.json({ error: "Missing required parameter: taskId" }, { status: 400 });
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

    // 2. Fetch original task details
    const { data: originalTask, error: taskQueryErr } = await service
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .maybeSingle();

    if (taskQueryErr || !originalTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // 3. Update task record with new assignee
    const { data: updatedTask, error: updateError } = await service
      .from("tasks")
      .update({ assigned_to: dbAssigneeId })
      .eq("id", taskId)
      .select()
      .single();

    if (updateError) {
      console.error("[Tasks Assign] Database error:", updateError.message);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 4. Trigger Email Notification to the new assignee
    if (employeeEmail && employeeName) {
      const emailHtml = `
        <div style="font-family: sans-serif; padding: 24px; color: #333; line-height: 1.6;">
          <h2 style="color: #6366f1; font-size: 20px; margin-top: 0;">Task Reassignment Notice</h2>
          <p>Hello ${employeeName},</p>
          <p>You have been assigned to the following task: <strong>${originalTask.title}</strong>.</p>
          <p><strong>Task Details:</strong></p>
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Title:</strong> ${originalTask.title}</p>
            <p style="margin: 0 0 8px 0;"><strong>Priority:</strong> ${originalTask.priority}</p>
            <p style="margin: 0 0 8px 0;"><strong>Due Date:</strong> ${originalTask.due_date || "Not specified"}</p>
            <p style="margin: 0;"><strong>Description:</strong><br/>${originalTask.description || "N/A"}</p>
          </div>
          <p style="margin-top: 24px;">Please check your dashboard to review and manage this task.</p>
          <p>Best regards,<br/>The Operations Team</p>
        </div>
      `;

      const { error: emailErr } = await sendEmail({
        to: employeeEmail,
        subject: `Assigned Task: ${originalTask.title}`,
        html: emailHtml
      });

      if (emailErr) {
        console.warn("[Tasks Assign] Notification email failed:", emailErr);
      }
    }

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error: any) {
    console.error("[Tasks Assign] Server Exception:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request) { return POST(req); }
