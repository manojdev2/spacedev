import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe secret key not configured");
    }

    // Use service role key to bypass RLS for admin queries
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Use anon key client for auth validation
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { action, returnUrl } = await req.json();
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Get user's organization (using admin client to bypass RLS)
    const { data: userRole } = await supabaseAdmin
      .from("user_roles")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!userRole?.organization_id) {
      throw new Error("No organization found");
    }

    // Get organization's stripe customer id
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("stripe_customer_id")
      .eq("id", userRole.organization_id)
      .single();

    if (!org?.stripe_customer_id) {
      throw new Error("No Stripe customer found");
    }

    if (action === "portal") {
      // Create billing portal session
      const session = await stripe.billingPortal.sessions.create({
        customer: org.stripe_customer_id,
        return_url: returnUrl || `${req.headers.get("origin")}/dashboard/settings`,
      });

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === "cancel") {
      // Get active subscription
      const { data: subscription } = await supabaseAdmin
        .from("subscriptions")
        .select("stripe_subscription_id")
        .eq("organization_id", userRole.organization_id)
        .single();

      if (!subscription?.stripe_subscription_id) {
        throw new Error("No active subscription found");
      }

      // Cancel at period end
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true,
      });

      return new Response(JSON.stringify({ success: true, message: "Subscription will cancel at period end" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === "reactivate") {
      const { data: subscription } = await supabaseAdmin
        .from("subscriptions")
        .select("stripe_subscription_id")
        .eq("organization_id", userRole.organization_id)
        .single();

      if (!subscription?.stripe_subscription_id) {
        throw new Error("No subscription found");
      }

      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: false,
      });

      return new Response(JSON.stringify({ success: true, message: "Subscription reactivated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error("Invalid action");
  } catch (error) {
    console.error("Error managing subscription:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
