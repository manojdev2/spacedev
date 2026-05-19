import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AppointmentNotificationRequest {
  customerEmail: string;
  customerName: string;
  status: "confirmed" | "cancelled" | "pending";
  appointmentDate: string;
  startTime: string;
  endTime: string;
  locationName: string;
  locationAddress: string;
  serviceName?: string;
  cancellationReason?: string;
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatTime = (timeStr: string): string => {
  const [hours, minutes] = timeStr.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      customerEmail,
      customerName,
      status,
      appointmentDate,
      startTime,
      endTime,
      locationName,
      locationAddress,
      serviceName,
      cancellationReason,
    }: AppointmentNotificationRequest = await req.json();

    if (!customerEmail || !customerName || !status || !appointmentDate || !startTime || !locationName) {
      throw new Error("Missing required fields");
    }

    const formattedDate = formatDate(appointmentDate);
    const formattedStartTime = formatTime(startTime);
    const formattedEndTime = formatTime(endTime);

    let subject: string;
    let html: string;

    if (status === "confirmed") {
      subject = `✅ Your appointment at ${locationName} is confirmed!`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">✅ Appointment Confirmed!</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 16px; color: #374151;">Hi ${customerName},</p>
            <p style="font-size: 16px; color: #374151;">Great news! Your appointment has been confirmed. Here are the details:</p>
            
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">📍 Location</td>
                  <td style="padding: 10px 0; color: #111827; font-weight: 600;">${locationName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">📋 Address</td>
                  <td style="padding: 10px 0; color: #111827;">${locationAddress}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">📅 Date</td>
                  <td style="padding: 10px 0; color: #111827; font-weight: 600;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">⏰ Time</td>
                  <td style="padding: 10px 0; color: #111827; font-weight: 600;">${formattedStartTime} - ${formattedEndTime}</td>
                </tr>
                ${serviceName ? `
                <tr>
                  <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">🛠️ Service</td>
                  <td style="padding: 10px 0; color: #111827;">${serviceName}</td>
                </tr>
                ` : ""}
              </table>
            </div>
            
            <p style="font-size: 14px; color: #6b7280;">Please arrive 5-10 minutes before your scheduled time. If you need to reschedule or cancel, please contact us as soon as possible.</p>
          </div>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 0 0 12px 12px; text-align: center;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">We look forward to seeing you!</p>
          </div>
        </div>
      `;
    } else if (status === "cancelled") {
      subject = `❌ Your appointment at ${locationName} has been cancelled`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Appointment Cancelled</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 16px; color: #374151;">Hi ${customerName},</p>
            <p style="font-size: 16px; color: #374151;">We regret to inform you that your appointment has been cancelled.</p>
            
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">📍 Location</td>
                  <td style="padding: 10px 0; color: #111827;">${locationName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">📅 Original Date</td>
                  <td style="padding: 10px 0; color: #111827;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">⏰ Original Time</td>
                  <td style="padding: 10px 0; color: #111827;">${formattedStartTime}</td>
                </tr>
                ${cancellationReason ? `
                <tr>
                  <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">📝 Reason</td>
                  <td style="padding: 10px 0; color: #111827;">${cancellationReason}</td>
                </tr>
                ` : ""}
              </table>
            </div>
            
            <p style="font-size: 14px; color: #6b7280;">We apologize for any inconvenience. Please feel free to book another appointment at your convenience.</p>
          </div>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 0 0 12px 12px; text-align: center;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">Thank you for your understanding.</p>
          </div>
        </div>
      `;
    } else {
      // Pending - booking confirmation
      subject = `📅 Your appointment request at ${locationName} has been received`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Appointment Request Received</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 16px; color: #374151;">Hi ${customerName},</p>
            <p style="font-size: 16px; color: #374151;">Thank you for your appointment request! We've received your booking and will confirm it shortly.</p>
            
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">📍 Location</td>
                  <td style="padding: 10px 0; color: #111827; font-weight: 600;">${locationName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">📅 Requested Date</td>
                  <td style="padding: 10px 0; color: #111827;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">⏰ Requested Time</td>
                  <td style="padding: 10px 0; color: #111827;">${formattedStartTime} - ${formattedEndTime}</td>
                </tr>
                ${serviceName ? `
                <tr>
                  <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">🛠️ Service</td>
                  <td style="padding: 10px 0; color: #111827;">${serviceName}</td>
                </tr>
                ` : ""}
                <tr>
                  <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">📊 Status</td>
                  <td style="padding: 10px 0;"><span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">Pending Confirmation</span></td>
                </tr>
              </table>
            </div>
            
            <p style="font-size: 14px; color: #6b7280;">You'll receive another email once your appointment is confirmed.</p>
          </div>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 0 0 12px 12px; text-align: center;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">Thank you for choosing us!</p>
          </div>
        </div>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: "LocatePro <onboarding@resend.dev>",
      to: [customerEmail],
      subject,
      html,
    });

    console.log("Appointment notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    console.error("Error in send-appointment-notification function:", error);
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
