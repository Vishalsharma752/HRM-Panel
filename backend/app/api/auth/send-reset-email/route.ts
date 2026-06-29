import { NextResponse } from "next/server";
import { sendEmail } from "../../../lib/resend";

export async function POST(req: Request) {
  try {
    const { email, name, resetLink } = await req.json();
    if (!email || !name || !resetLink) {
      return NextResponse.json({ error: "Missing required fields: email, name, and resetLink are required." }, { status: 400 });
    }

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">TIS Nexus HRM</h2>
        </div>
        <div style="border-top: 2px solid #e2e8f0; padding-top: 24px;">
          <p style="color: #334155; font-size: 16px; margin-bottom: 12px;">Hello ${name},</p>
          <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            We received a request to reset your password.
          </p>
          <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            Click the button below:
          </p>
          <div style="margin: 28px 0; text-align: center;">
            <a href="${resetLink}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">Reset Password</a>
          </div>
          <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-top: 24px;">
            If you did not request this, please ignore this email.
          </p>
        </div>
        <div style="margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center;">
          <p style="font-size: 11px; color: #94a3b8; margin: 0;">TIS Nexus HRM Portal &bull; Secure Access</p>
        </div>
      </div>
    `;

    const { data, error } = await sendEmail({
      to: email.trim(),
      subject: "Reset Your Password",
      html: htmlContent,
      templateType: "PasswordReset",
    });

    if (error) {
      console.error("Resend error sending reset password email:", error);
      return NextResponse.json({ error: error.message || "Email delivery failed via Resend" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Forgot password api error:", err);
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 });
  }
}
