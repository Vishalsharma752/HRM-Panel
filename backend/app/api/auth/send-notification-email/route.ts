import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/resend";

export async function POST(req: Request) {
  try {
    const { to, templateType, data } = await req.json();
    if (!to || !templateType || !data) {
      return NextResponse.json({ error: "Missing required fields: to, templateType, and data are required." }, { status: 400 });
    }

    const name = data.name || "Employee";
    let subject = "";
    let htmlContent = "";

    if (templateType === "Birthday") {
      subject = `Happy Birthday, ${name}! 🎂`;
      htmlContent = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #fbcfe8; border-radius: 12px; background-color: #fffafb; text-align: center;">
          <h1 style="color: #db2777; margin: 0; font-size: 28px;">Happy Birthday, ${name}! 🎉</h1>
          <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-top: 20px;">
            Wishing you a wonderful day filled with celebration, joy, and success! We are incredibly grateful to have you on the team.
          </p>
          <div style="font-size: 60px; margin: 24px 0;">🎂🎁🎈</div>
          <p style="color: #64748b; font-size: 14px; margin-top: 24px;">Enjoy your special day!</p>
          <div style="margin-top: 32px; border-top: 1px solid #fbcfe8; padding-top: 16px;">
            <p style="font-size: 11px; color: #94a3b8; margin: 0;">TIS Nexus HRM Portal &bull; Celebrations Service</p>
          </div>
        </div>
      `;
    } else if (templateType === "LeaveApproved") {
      subject = "Leave Request Approved - TIS Nexus";
      htmlContent = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #bbf7d0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #16a34a; margin-top: 0; font-size: 20px;">Leave Request Approved</h2>
          <p style="color: #334155; font-size: 15px; line-height: 1.6;">Hello ${name},</p>
          <p style="color: #475569; font-size: 15px; line-height: 1.6;">
            Your leave request has been reviewed and <strong>APPROVED</strong>.
          </p>
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <table style="width: 100%;">
              <tr><td style="color: #64748b; font-size: 13px; font-weight: 600; width: 120px;">FROM DATE:</td><td style="color: #1e293b; font-size: 14px; font-weight: 700;">${data.fromDate}</td></tr>
              <tr><td style="color: #64748b; font-size: 13px; font-weight: 600;">TO DATE:</td><td style="color: #1e293b; font-size: 14px; font-weight: 700;">${data.toDate}</td></tr>
              <tr><td style="color: #64748b; font-size: 13px; font-weight: 600;">TOTAL DAYS:</td><td style="color: #1e293b; font-size: 14px; font-weight: 700;">${data.days} days</td></tr>
            </table>
          </div>
          <p style="color: #64748b; font-size: 13px; line-height: 1.5;">Reason: ${data.reason || "Not specified"}</p>
        </div>
      `;
    } else if (templateType === "LeaveRejected") {
      subject = "Leave Request Rejected - TIS Nexus";
      htmlContent = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #fecaca; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #dc2626; margin-top: 0; font-size: 20px;">Leave Request Rejected</h2>
          <p style="color: #334155; font-size: 15px; line-height: 1.6;">Hello ${name},</p>
          <p style="color: #475569; font-size: 15px; line-height: 1.6;">
            We regret to inform you that your leave request has been reviewed and <strong>REJECTED</strong>.
          </p>
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <table style="width: 100%;">
              <tr><td style="color: #64748b; font-size: 13px; font-weight: 600; width: 120px;">FROM DATE:</td><td style="color: #1e293b; font-size: 14px; font-weight: 700;">${data.fromDate}</td></tr>
              <tr><td style="color: #64748b; font-size: 13px; font-weight: 600;">TO DATE:</td><td style="color: #1e293b; font-size: 14px; font-weight: 700;">${data.toDate}</td></tr>
              <tr><td style="color: #64748b; font-size: 13px; font-weight: 600;">TOTAL DAYS:</td><td style="color: #1e293b; font-size: 14px; font-weight: 700;">${data.days} days</td></tr>
            </table>
          </div>
          <p style="color: #64748b; font-size: 13px; line-height: 1.5;">Reason: ${data.reason || "Not specified"}</p>
        </div>
      `;
    } else if (templateType === "Payroll") {
      subject = `Payslip Available for ${data.month} - TIS Nexus`;
      htmlContent = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #4f46e5; margin-top: 0; font-size: 20px;">Payslip Released</h2>
          <p style="color: #334155; font-size: 15px;">Hello ${name},</p>
          <p style="color: #475569; font-size: 15px; line-height: 1.6;">
            Your payslip for the month of <strong>${data.month}</strong> has been generated and is now available in the portal.
          </p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <table style="width: 100%;">
              <tr><td style="color: #64748b; font-size: 13px; font-weight: 600; width: 150px;">BASIC SALARY:</td><td style="color: #1e293b; font-size: 14px; font-weight: 700;">₹${data.basicSalary}</td></tr>
              <tr><td style="color: #64748b; font-size: 13px; font-weight: 600;">HRA:</td><td style="color: #1e293b; font-size: 14px; font-weight: 700;">₹${data.hra}</td></tr>
              <tr><td style="color: #64748b; font-size: 13px; font-weight: 600; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 8px;">NET SALARY:</td><td style="color: #4f46e5; font-size: 16px; font-weight: 800; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 8px;">₹${data.netSalary}</td></tr>
            </table>
          </div>
          <p style="color: #64748b; font-size: 13px;">Please log in to the portal to view/download the full salary slip.</p>
        </div>
      `;
    } else if (templateType === "Announcement") {
      subject = `Company Announcement: ${data.title}`;
      htmlContent = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="background-color: #4f46e5; color: #ffffff; padding: 12px; text-align: center; font-weight: bold; border-radius: 6px; margin-bottom: 20px;">
            ANNOUNCEMENT
          </div>
          <h2 style="color: #1e293b; margin-top: 0; font-size: 20px;">${data.title}</h2>
          <p style="color: #334155; font-size: 15px; line-height: 1.6;">Hello ${name},</p>
          <p style="color: #475569; font-size: 15px; line-height: 1.6; white-space: pre-line;">
            ${data.content}
          </p>
          <div style="margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center;">
            <p style="font-size: 11px; color: #94a3b8; margin: 0;">TIS Nexus HRM Portal &bull; Broadcasts</p>
          </div>
        </div>
      `;
    } else {
      return NextResponse.json({ error: "Invalid templateType." }, { status: 400 });
    }

    const { data: resData, error } = await sendEmail({
      to: to.trim(),
      subject,
      html: htmlContent,
      templateType,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "An unexpected error occurred." }, { status: 500 });
  }
}
