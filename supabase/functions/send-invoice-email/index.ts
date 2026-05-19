import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InvoiceEmailRequest {
  recipientEmail: string;
  recipientName?: string;
  invoiceNumber: string;
  invoiceDate: string;
  amount: number;
  currency: string;
  description: string;
  paymentMethod: string;
  status: string;
  transactionId?: string;
}

function generateInvoiceHTML(invoice: InvoiceEmailRequest): string {
  const statusColors: Record<string, { bg: string; text: string }> = {
    succeeded: { bg: "#dcfce7", text: "#166534" },
    pending: { bg: "#fef3c7", text: "#92400e" },
    failed: { bg: "#fee2e2", text: "#991b1b" },
    refunded: { bg: "#e5e7eb", text: "#374151" },
  };

  const statusStyle = statusColors[invoice.status] || statusColors.pending;
  const statusLabel = invoice.status === "succeeded" ? "Paid" : 
                      invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice ${invoice.invoiceNumber}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9fafb;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <tr>
                <td style="padding: 40px 40px 20px; border-bottom: 1px solid #e5e7eb;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <h1 style="margin: 0; font-size: 24px; color: #6366f1;">LocatePro</h1>
                        <p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">Store Locator Platform</p>
                      </td>
                      <td align="right">
                        <span style="display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; background-color: ${statusStyle.bg}; color: ${statusStyle.text};">
                          ${statusLabel}
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Invoice Details -->
              <tr>
                <td style="padding: 30px 40px;">
                  <h2 style="margin: 0 0 20px; font-size: 20px; color: #1f2937;">Invoice Details</h2>
                  
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Invoice Number</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1f2937; font-family: monospace;">${invoice.invoiceNumber}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date</td>
                      <td style="padding: 8px 0; text-align: right; color: #1f2937;">${invoice.invoiceDate}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Payment Method</td>
                      <td style="padding: 8px 0; text-align: right; color: #1f2937; text-transform: capitalize;">${invoice.paymentMethod.replace('_', ' ')}</td>
                    </tr>
                    ${invoice.transactionId ? `
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Transaction ID</td>
                      <td style="padding: 8px 0; text-align: right; color: #1f2937; font-family: monospace; font-size: 12px;">${invoice.transactionId}</td>
                    </tr>
                    ` : ''}
                  </table>
                  
                  <!-- Amount Box -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 30px;">
                    <tr>
                      <td style="padding: 20px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="color: #6b7280; font-size: 14px;">Description</td>
                            <td style="text-align: right; color: #1f2937;">${invoice.description}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 0 20px 20px;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 2px solid #e5e7eb; padding-top: 15px;">
                          <tr>
                            <td style="padding-top: 15px; font-weight: 700; color: #1f2937; font-size: 16px;">Total Amount</td>
                            <td style="padding-top: 15px; text-align: right; font-weight: 700; color: #6366f1; font-size: 24px;">
                              $${invoice.amount.toFixed(2)} <span style="font-size: 14px; text-transform: uppercase;">${invoice.currency}</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                    Thank you for your business! If you have any questions about this invoice, please don't hesitate to contact our support team.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 20px 40px 30px; border-top: 1px solid #e5e7eb; text-align: center;">
                  <p style="margin: 0 0 8px; color: #9ca3af; font-size: 12px;">
                    This email was sent by LocatePro
                  </p>
                  <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                    <a href="mailto:support@locatepro.com" style="color: #6366f1; text-decoration: none;">support@locatepro.com</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }

    const invoiceData: InvoiceEmailRequest = await req.json();

    // Validate required fields
    if (!invoiceData.recipientEmail || !invoiceData.invoiceNumber || !invoiceData.amount) {
      throw new Error("Missing required fields: recipientEmail, invoiceNumber, and amount are required");
    }

    const emailHTML = generateInvoiceHTML(invoiceData);

    const emailResponse = await resend.emails.send({
       from: "LocatePro <onboarding@resend.dev>",
       to: [invoiceData.recipientEmail],
       subject: `Invoice ${invoiceData.invoiceNumber} from LocatePro`,
      html: emailHTML,
    });

    console.log("Invoice email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-invoice-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
