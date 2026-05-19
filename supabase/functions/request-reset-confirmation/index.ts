import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    
    if (userError || !user) {
      throw new Error("Unauthorized: User not authenticated");
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || roleData?.role !== "admin") {
      throw new Error("Unauthorized: Only admins can reset the installation");
    }

    // Generate a 6-digit confirmation code
    const confirmationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Use service role to store the confirmation code
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Delete any existing reset codes for this user
    await adminClient
      .from("system_config")
      .delete()
      .like("key", `reset_confirmation_${user.id}%`);

    // Store the new confirmation code
    const { error: insertError } = await adminClient
      .from("system_config")
      .insert({
        key: `reset_confirmation_${user.id}`,
        value: {
          code: confirmationCode,
          expires_at: expiresAt.toISOString(),
          user_id: user.id,
        },
      });

    if (insertError) {
      console.error("Error storing confirmation code:", insertError);
      throw new Error("Failed to generate confirmation code");
    }

    // Send email with the confirmation code
    const resend = new Resend(resendApiKey);
    
    const emailResponse = await resend.emails.send({
      from: "LocatePro <onboarding@resend.dev>",
      to: [user.email!],
      subject: "Installation Reset Confirmation Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #dc2626; margin-bottom: 20px;">⚠️ Installation Reset Request</h1>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            You have requested to reset the installation. This action will:
          </p>
          
          <ul style="color: #374151; font-size: 14px; line-height: 1.8;">
            <li>Sign out all users</li>
            <li>Require the setup wizard to be run again</li>
            <li>Require a new admin to be created</li>
          </ul>
          
          <div style="background: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
            <p style="color: #374151; font-size: 14px; margin: 0 0 12px 0;">Your confirmation code is:</p>
            <p style="font-size: 36px; font-weight: bold; color: #dc2626; letter-spacing: 8px; margin: 0;">
              ${confirmationCode}
            </p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            This code expires in <strong>15 minutes</strong>.
          </p>
          
          <p style="color: #6b7280; font-size: 14px;">
            If you did not request this reset, please ignore this email and ensure your account is secure.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          
          <p style="color: #9ca3af; font-size: 12px;">
            This email was sent to ${user.email} because an installation reset was requested.
          </p>
        </div>
      `,
    });

    console.log(`Reset confirmation code sent to: ${user.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Confirmation code sent to your email",
        email: user.email?.replace(/(.{2})(.*)(@.*)/, "$1***$3"), // Mask email
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Request reset confirmation error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
