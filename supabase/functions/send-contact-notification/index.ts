import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ContactNotificationRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, subject, message }: ContactNotificationRequest = await req.json();

    if (!name || !email || !subject || !message) {
      throw new Error("Missing required fields: name, email, subject, message");
    }

    // Send notification to admin
    const adminEmailResponse = await resend.emails.send({
      from: "LocatePro <onboarding@resend.dev>",
      to: ["hello@locatepro.com"], // Admin email - change this to your actual admin email
      subject: `New Contact Form: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #3b82f6;">📬 New Contact Form Submission</h1>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>From:</strong> ${name}</p>
            <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            <p><strong>Subject:</strong> ${subject}</p>
          </div>
          <h3>Message:</h3>
          <div style="background: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <p style="white-space: pre-wrap;">${message}</p>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="color: #6b7280; font-size: 14px;">
            Reply directly to this email or click <a href="mailto:${email}">here</a> to respond to the sender.
          </p>
        </div>
      `,
      reply_to: email,
    });

    console.log("Admin notification email sent:", adminEmailResponse);

    // Send confirmation to the sender
    const confirmationEmailResponse = await resend.emails.send({
      from: "LocatePro <onboarding@resend.dev>",
      to: [email],
      subject: "We received your message - LocatePro",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #3b82f6;">Thanks for reaching out, ${name}! 👋</h1>
          <p>We've received your message and will get back to you within 24 hours.</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Your message:</strong></p>
            <p><em>Subject: ${subject}</em></p>
            <p style="white-space: pre-wrap; color: #6b7280;">${message}</p>
          </div>
          <p>In the meantime, feel free to explore our <a href="https://locatepro.com/locator">store locator</a> or check out our <a href="https://locatepro.com/pricing">pricing plans</a>.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="color: #6b7280; font-size: 14px;">
            Best regards,<br>
            The LocatePro Team
          </p>
        </div>
      `,
    });

    console.log("Confirmation email sent to sender:", confirmationEmailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: { 
          adminEmail: adminEmailResponse, 
          confirmationEmail: confirmationEmailResponse 
        } 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-contact-notification function:", error);
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
