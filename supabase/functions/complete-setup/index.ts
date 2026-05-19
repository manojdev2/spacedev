import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SetupRequest {
  organizationName: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
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

    // Check if setup is already complete
    const { data: existingConfig } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", "setup_complete")
      .maybeSingle();

    if (existingConfig?.value?.completed === true) {
      return new Response(
        JSON.stringify({ error: "Setup has already been completed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: SetupRequest = await req.json();
    const { organizationName, adminName, adminEmail, adminPassword } = body;

    // Validate inputs
    if (!organizationName || !adminName || !adminEmail || !adminPassword) {
      return new Response(
        JSON.stringify({ error: "All fields are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (adminPassword.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the organization first
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: organizationName,
        plan: "starter",
      })
      .select()
      .single();

    if (orgError) {
      console.error("[complete-setup] Error creating organization:", orgError);
      return new Response(
        JSON.stringify({ error: "Failed to create organization" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the admin user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: false, // Require email verification
      user_metadata: {
        full_name: adminName,
        organization_name: organizationName,
      },
    });

    if (authError) {
      console.error("[complete-setup] Error creating user:", authError);
      // Clean up the organization if user creation fails
      await supabase.from("organizations").delete().eq("id", org.id);
      return new Response(
        JSON.stringify({ error: authError.message || "Failed to create admin user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user!.id;

    // Delete any auto-created organization from trigger (if any) and assign to our org
    // First, find and remove any auto-created org assignment
    const { data: autoRole } = await supabase
      .from("user_roles")
      .select("organization_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (autoRole && autoRole.organization_id !== org.id) {
      // Delete the auto-created organization
      await supabase.from("organizations").delete().eq("id", autoRole.organization_id);
      // Delete the auto-created role
      await supabase.from("user_roles").delete().eq("user_id", userId);
    }

    // Assign admin role to the new organization (if not already done by trigger)
    const { error: roleError } = await supabase
      .from("user_roles")
      .upsert(
        {
          user_id: userId,
          organization_id: org.id,
          role: "admin",
        },
        { onConflict: "user_id" }
      );

    if (roleError) {
      console.error("[complete-setup] Error assigning role:", roleError);
      // Insert instead of upsert if upsert fails
      await supabase.from("user_roles").insert({
        user_id: userId,
        organization_id: org.id,
        role: "admin",
      });
    }

    // Create profile
    await supabase.from("profiles").upsert(
      {
        user_id: userId,
        display_name: adminName,
      },
      { onConflict: "user_id" }
    );

    // Mark setup as complete
    await supabase.from("system_config").insert({
      key: "setup_complete",
      value: {
        completed: true,
        completed_at: new Date().toISOString(),
        admin_email: adminEmail,
        organization_id: org.id,
      },
    });

    console.log("[complete-setup] Setup completed successfully for:", adminEmail);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Setup completed successfully",
        organizationId: org.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[complete-setup] Unexpected error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
