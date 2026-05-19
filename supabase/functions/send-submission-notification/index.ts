import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SubmissionNotificationRequest {
  email: string;
  businessName: string;
  status: "approved" | "rejected";
  contactName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, businessName, status, contactName }: SubmissionNotificationRequest = await req.json();

    // Validate required fields
    if (!email || !businessName || !status || !contactName) {
      throw new Error("Missing required fields: email, businessName, status, contactName");
    }

    const isApproved = status === "approved";
    const subject = isApproved
      ? `Great news! ${businessName} has been approved`
      : `Update on your ${businessName} submission`;

    const html = isApproved
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #16a34a;">🎉 Congratulations, ${contactName}!</h1>
          <p>Great news! Your store registration for <strong>${businessName}</strong> has been approved.</p>
          <p>Your store is now live on our platform and customers can find you through our store locator.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="color: #6b7280; font-size: 14px;">
            Thank you for joining our network. If you have any questions, please don't hesitate to reach out.
          </p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #dc2626;">Update on Your Submission</h1>
          <p>Dear ${contactName},</p>
          <p>Thank you for your interest in registering <strong>${businessName}</strong> on our platform.</p>
          <p>After careful review, we regret to inform you that your submission could not be approved at this time.</p>
          <p>This could be due to incomplete information or not meeting our current criteria. You're welcome to submit a new application with updated details.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="color: #6b7280; font-size: 14px;">
            If you believe this was a mistake or have questions, please contact our support team.
          </p>
        </div>
      `;

    const emailResponse = await resend.emails.send({
      from: "LocatePro <onboarding@resend.dev>",
      to: [email],
      subject,
      html,
    });

    console.log("Submission notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    console.error("Error in send-submission-notification function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
