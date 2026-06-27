import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

export const resend = new Resend(resendApiKey);

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  try {
    const response = await resend.emails.send({
      from: "HR Portal <onboarding@resend.dev>",
      to,
      subject,
      html,
    });
    
    if (response.error) {
      console.error("Resend delivery failure:", response.error);
      return { data: null, error: response.error };
    }
    
    return { data: response.data, error: null };
  } catch (error: any) {
    console.error("Error sending email via Resend:", error);
    return { data: null, error };
  }
}
