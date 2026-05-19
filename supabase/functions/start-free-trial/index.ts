import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TRIAL_DAYS = 14;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    // Get user's organization
    const { data: userRole, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (roleError || !userRole?.organization_id) {
      throw new Error("User organization not found");
    }

    const organizationId = userRole.organization_id;

    // Check if user already has a subscription (active, trialing, or past)
    const { data: existingSubscription } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (existingSubscription) {
      if (existingSubscription.status === "active" || existingSubscription.status === "trialing") {
        throw new Error("You already have an active subscription or trial");
      }
      // If there's a canceled/expired subscription, check if they've already used a trial
      if (existingSubscription.trial_end) {
        throw new Error("You've already used your free trial. Please subscribe to continue.");
      }
    }

    // Calculate trial period
    const now = new Date();
    const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    // Create or update subscription with trial
    if (existingSubscription) {
      const { error: updateError } = await supabaseClient
        .from("subscriptions")
        .update({
          status: "trialing",
          plan: "starter",
          trial_end: trialEnd.toISOString(),
          current_period_start: now.toISOString(),
          current_period_end: trialEnd.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", existingSubscription.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabaseClient
        .from("subscriptions")
        .insert({
          organization_id: organizationId,
          status: "trialing",
          plan: "starter",
          payment_method: "stripe",
          trial_end: trialEnd.toISOString(),
          current_period_start: now.toISOString(),
          current_period_end: trialEnd.toISOString(),
        });

      if (insertError) throw insertError;
    }

    // Update organization plan
    await supabaseClient
      .from("organizations")
      .update({ plan: "starter" })
      .eq("id", organizationId);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Your ${TRIAL_DAYS}-day free trial has started!`,
        trial_end: trialEnd.toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[START-FREE-TRIAL] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
