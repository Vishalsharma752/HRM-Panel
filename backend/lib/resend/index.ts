import { Resend } from "resend";
import { getServiceClient } from "../supabase";

const resendApiKey = process.env.RESEND_API_KEY;

export const resend = new Resend(resendApiKey);

export async function sendEmail({
  to,
  subject,
  html,
  templateType = "Unknown",
}: {
  to: string | string[];
  subject: string;
  html: string;
  templateType?: string;
}) {
  const recipient = Array.isArray(to) ? to.join(", ") : to;
  let status = "Sent";
  let errorMessage: string | null = null;
  let responseData: any = null;

  try {
    const { data: resData, error: resError } = await resend.emails.send({
      from: "HR Portal <onboarding@resend.dev>",
      to,
      subject,
      html,
    });
    
    if (resError) {
      status = "Failed";
      errorMessage = typeof resError === "object" ? JSON.stringify(resError) : String(resError);
      console.error("Resend delivery failure:", resError);
    } else {
      responseData = resData;
    }
  } catch (error: any) {
    status = "Failed";
    errorMessage = error.message || String(error);
    console.error("Error sending email via Resend:", error);
  }

  // Log to database using Service Role client to bypass RLS policies
  try {
    const supabase = getServiceClient();
    await supabase.from("email_logs").insert([
      {
        to_email: recipient,
        subject,
        template_type: templateType,
        status,
        error_message: errorMessage,
        sent_at: new Date().toISOString(),
      }
    ]);
  } catch (logErr) {
    console.error("Failed to write to email_logs table:", logErr);
  }

  return { data: responseData, error: errorMessage };
}
