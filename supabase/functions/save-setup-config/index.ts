import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SetupConfigRequest {
  identity?: {
    appName: string;
    tagline: string;
    primaryColor: string;
    websiteUrl: string;
  };
  settings?: {
    defaultLanguage: string;
    defaultTimezone: string;
    distanceUnit: string;
    allowPublicSubmissions: boolean;
    requireApproval: boolean;
  };
  email?: {
    enableEmailNotifications: boolean;
    senderName: string;
    senderEmail: string;
    notifyOnSubmission: boolean;
    notifyOnApproval: boolean;
  };
  security?: {
    requireEmailVerification: boolean;
    sessionTimeout: string;
    enforceStrongPasswords: boolean;
    enableRateLimiting: boolean;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body: SetupConfigRequest = await req.json();
    const { identity, settings, email, security } = body;

    const configUpdates = [];

    // Save app identity configuration
    if (identity) {
      configUpdates.push(
        supabase
          .from("system_config")
          .upsert(
            {
              key: "app_identity",
              value: {
                app_name: identity.appName,
                tagline: identity.tagline,
                primary_color: identity.primaryColor,
                website_url: identity.websiteUrl,
                updated_at: new Date().toISOString(),
              },
            },
            { onConflict: "key" }
          )
      );
    }

    // Save system settings
    if (settings) {
      configUpdates.push(
        supabase
          .from("system_config")
          .upsert(
            {
              key: "system_settings",
              value: {
                default_language: settings.defaultLanguage,
                default_timezone: settings.defaultTimezone,
                distance_unit: settings.distanceUnit,
                allow_public_submissions: settings.allowPublicSubmissions,
                require_approval: settings.requireApproval,
                updated_at: new Date().toISOString(),
              },
            },
            { onConflict: "key" }
          )
      );
    }

    // Save email configuration
    if (email) {
      configUpdates.push(
        supabase
          .from("system_config")
          .upsert(
            {
              key: "email_config",
              value: {
                enabled: email.enableEmailNotifications,
                sender_name: email.senderName,
                sender_email: email.senderEmail,
                notify_on_submission: email.notifyOnSubmission,
                notify_on_approval: email.notifyOnApproval,
                updated_at: new Date().toISOString(),
              },
            },
            { onConflict: "key" }
          )
      );
    }

    // Save security configuration
    if (security) {
      configUpdates.push(
        supabase
          .from("system_config")
          .upsert(
            {
              key: "security_config",
              value: {
                require_email_verification: security.requireEmailVerification,
                session_timeout: security.sessionTimeout,
                enforce_strong_passwords: security.enforceStrongPasswords,
                enable_rate_limiting: security.enableRateLimiting,
                updated_at: new Date().toISOString(),
              },
            },
            { onConflict: "key" }
          )
      );
    }

    // Execute all updates
    const results = await Promise.all(configUpdates);
    
    // Check for errors
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.error("[save-setup-config] Errors:", errors.map(e => e.error));
      return new Response(
        JSON.stringify({ error: "Failed to save some configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[save-setup-config] Configuration saved successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Configuration saved successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[save-setup-config] Unexpected error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
