import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { confirmationCode } = await req.json();
    
    if (!confirmationCode) {
      throw new Error("Confirmation code is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    // Use service role to verify the confirmation code
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: configData, error: configError } = await adminClient
      .from("system_config")
      .select("value")
      .eq("key", `reset_confirmation_${user.id}`)
      .single();

    if (configError || !configData) {
      throw new Error("No pending reset confirmation found. Please request a new code.");
    }

    const storedData = configData.value as { code: string; expires_at: string; user_id: string };
    
    // Verify the code
    if (storedData.code !== confirmationCode) {
      throw new Error("Invalid confirmation code");
    }

    // Check expiration
    if (new Date(storedData.expires_at) < new Date()) {
      // Clean up expired code
      await adminClient
        .from("system_config")
        .delete()
        .eq("key", `reset_confirmation_${user.id}`);
      throw new Error("Confirmation code has expired. Please request a new code.");
    }

    // Delete the confirmation code first
    await adminClient
      .from("system_config")
      .delete()
      .eq("key", `reset_confirmation_${user.id}`);

    // Now delete the setup_complete config
    const { error: deleteError } = await adminClient
      .from("system_config")
      .delete()
      .eq("key", "setup_complete");

    if (deleteError) {
      console.error("Error deleting system_config:", deleteError);
      throw new Error("Failed to reset installation status");
    }

    console.log(`Installation reset by admin user: ${user.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Installation has been reset. Please run the setup wizard.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Reset installation error:", error);
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
