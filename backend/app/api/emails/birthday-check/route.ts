import { NextResponse } from "next/server";
import { getServiceClient } from "../../../lib/supabase";
import { sendEmail } from "../../../lib/resend";

export async function GET(req: Request) {
  try {
    const supabase = getServiceClient();

    // 1. Fetch all active employees
    const { data: employees, error } = await supabase
      .from("employees")
      .select("full_name, official_email, dob, status")
      .eq("status", "Active");

    if (error) {
      console.error("Failed to query employees for birthday check:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!employees || employees.length === 0) {
      return NextResponse.json({ message: "No active employees found." });
    }

    // 2. Identify whose birthday is today
    const today = new Date();
    const todayMonth = today.getMonth() + 1; // 1-indexed
    const todayDay = today.getDate();

    const birthdayEmployees = employees.filter((emp) => {
      if (!emp.dob) return false;
      const dobDate = new Date(emp.dob);
      return (dobDate.getMonth() + 1) === todayMonth && dobDate.getDate() === todayDay;
    });

    if (birthdayEmployees.length === 0) {
      return NextResponse.json({ message: "No birthdays today." });
    }

    let sentCount = 0;
    let failedCount = 0;

    // 3. Send Happy Birthday email for each birthday employee
    for (const emp of birthdayEmployees) {
      const subject = `Happy Birthday, ${emp.full_name}! 🎂`;
      const htmlContent = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #fbcfe8; border-radius: 12px; background-color: #fffafb; text-align: center;">
          <h1 style="color: #db2777; margin: 0; font-size: 28px;">Happy Birthday, ${emp.full_name}! 🎉</h1>
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

      const res = await sendEmail({
        to: emp.official_email,
        subject,
        html: htmlContent,
        templateType: "Birthday",
      });

      if (res.error) {
        failedCount++;
      } else {
        sentCount++;
      }
    }

    return NextResponse.json({
      message: "Birthday cron check executed successfully.",
      birthdaysToday: birthdayEmployees.length,
      emailsSent: sentCount,
      emailsFailed: failedCount
    });
  } catch (err: any) {
    console.error("Birthday cron error:", err);
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 });
  }
}
