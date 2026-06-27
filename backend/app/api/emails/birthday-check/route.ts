import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../lib/supabase";
import { sendEmail } from "../../../../lib/resend";

export async function GET(req: Request) {
  try {
    // 1. Verify daily cron authorization token
    const { searchParams } = new URL(req.url);
    const paramKey = searchParams.get("key");
    const authHeader = req.headers.get("Authorization");
    const headerKey = authHeader ? authHeader.replace("Bearer ", "").trim() : "";
    
    const secretKey = process.env.CRON_SECRET || "tisnx_cron_secret_123";
    if (paramKey !== secretKey && headerKey !== secretKey) {
      return NextResponse.json({ error: "Unauthorized: Invalid cron signature" }, { status: 401 });
    }

    const service = getServiceClient();

    // 2. Fetch all active employees
    const { data: employees, error: fetchErr } = await service
      .from("employees")
      .select("id, full_name, official_email, dob")
      .eq("status", "Active");

    if (fetchErr) {
      console.error("[Birthday Cron] Error fetching employees:", fetchErr.message);
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!employees || employees.length === 0) {
      return NextResponse.json({ success: true, message: "No active employees to scan", matches: 0 });
    }

    // 3. Scan matching DOBs (Day and Month)
    const today = new Date();
    const todayMonth = today.getMonth() + 1; // 1-indexed month
    const todayDay = today.getDate();

    const matches: any[] = [];

    for (const emp of employees) {
      if (!emp.dob) continue;
      
      const dobDate = new Date(emp.dob);
      const dobMonth = dobDate.getMonth() + 1;
      const dobDay = dobDate.getDate();
      
      if (dobMonth === todayMonth && dobDay === todayDay) {
        matches.push(emp);
      }
    }

    if (matches.length === 0) {
      return NextResponse.json({ success: true, message: "No birthdays today", matches: 0 });
    }

    // 4. Send emails automatically via Resend
    let sentCount = 0;
    for (const match of matches) {
      const emailHtml = `
        <div style="font-family: sans-serif; text-align: center; padding: 32px; color: #333; line-height: 1.6; max-width: 500px; border: 1px solid #e5e7eb; border-radius: 16px; margin: 0 auto; background-color: #faf5ff;">
          <h1 style="color: #8b5cf6; margin-top: 0; font-size: 24px;">Happy Birthday, ${match.full_name}! 🎂 🎉</h1>
          <p style="font-size: 16px; color: #4b5563;">
            Wishing you a wonderful day filled with joy, laughter, and celebration!
          </p>
          <div style="font-size: 60px; margin: 24px 0;">🎈 🎁 🍰</div>
          <p style="font-size: 14px; color: #6b7280; font-style: italic; margin-bottom: 24px;">
            "Wishing you a year ahead full of success, good health, and happiness. Thank you for being an amazing part of our team!"
          </p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="font-size: 12px; color: #9ca3af; margin-bottom: 0;">Warm wishes from all of us at TIS Nexus.</p>
        </div>
      `;

      const { error: emailErr } = await sendEmail({
        to: match.official_email,
        subject: `Happy Birthday, ${match.full_name}! 🎂`,
        html: emailHtml
      });

      if (!emailErr) {
        sentCount++;
      } else {
        console.warn(`[Birthday Cron] Email failed for ${match.full_name}:`, emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed birthdays. Matches: ${matches.length}, Emails Sent: ${sentCount}`,
      recipients: matches.map(m => m.full_name)
    });
  } catch (error: any) {
    console.error("[Birthday Cron] Server Exception:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) { return GET(req); }
