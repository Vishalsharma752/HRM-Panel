import { NextResponse } from "next/server";
import { getAuthUser, isAuthorized } from "../../../../lib/auth";
import { sendEmail } from "../../../../lib/resend";

export async function POST(req: Request) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser || !isAuthorized(authUser, ["Founder", "Cofounder"])) {
      return NextResponse.json({ error: "Forbidden: Administrative access required" }, { status: 403 });
    }

    const body = await req.json();
    const { email, name, password } = body;

    if (!email || !name || !password) {
      return NextResponse.json({ error: "Missing required fields: email, name, password" }, { status: 400 });
    }

    const emailHtml = `
      <div style="font-family: sans-serif; padding: 24px; color: #333; line-height: 1.6;">
        <h2 style="color: #6366f1; font-size: 20px; margin-top: 0;">Welcome to TIS Nexus, ${name}!</h2>
        <p>Your HR portal account is active.</p>
        <p>Use these credentials to log in:</p>
        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 0;"><strong>Password:</strong> ${password}</p>
        </div>
        <p style="color: #ef4444; font-size: 11px;">Change your password once logged in.</p>
        <p>Best regards,<br/>HR Operations Team</p>
      </div>
    `;

    const { error } = await sendEmail({
      to: email,
      subject: "Welcome to the Team - Account Activated",
      html: emailHtml
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Welcome email sent successfully to ${email}.` });
  } catch (error: any) {
    console.error("[Welcome Email API] Exception:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
