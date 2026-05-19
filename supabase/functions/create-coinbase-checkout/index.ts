import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_PRICES: Record<string, { amount: string; name: string }> = {
  starter: { amount: "29.00", name: "Starter Plan" },
  professional: { amount: "79.00", name: "Professional Plan" },
  enterprise: { amount: "199.00", name: "Enterprise Plan" },
};

// Helper to get Coinbase Commerce credentials from database
// deno-lint-ignore no-explicit-any
async function getCoinbaseCredentials(
  supabaseAdmin: any,
  organizationId: string
): Promise<{ apiKey: string; isLiveMode: boolean }> {
  const { data: gatewaySettings } = await supabaseAdmin
    .from("payment_gateway_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("gateway_type", "crypto")
    .eq("is_enabled", true)
    .single();

  if (!gatewaySettings) {
    throw new Error("Cryptocurrency payments are not configured. Please set up Coinbase Commerce in Settings > Payment Gateways.");
  }

  const isLiveMode = Boolean(gatewaySettings.is_live_mode);
  const apiKey = isLiveMode
    ? (gatewaySettings.live_api_key as string | null)
    : (gatewaySettings.test_api_key as string | null);

  if (!apiKey) {
    throw new Error(`Coinbase Commerce ${isLiveMode ? "live" : "test"} API key is not configured.`);
  }

  console.log(`Using organization's ${isLiveMode ? "live" : "sandbox"} Coinbase Commerce credentials`);
  return { apiKey, isLiveMode };
}

// Create Coinbase Commerce charge
async function createCoinbaseCharge(
  apiKey: string,
  plan: string,
  redirectUrl: string,
  cancelUrl: string,
  metadata: Record<string, string>
): Promise<{ chargeId: string; hostedUrl: string }> {
  const planDetails = PLAN_PRICES[plan];

  const response = await fetch("https://api.commerce.coinbase.com/charges", {
    method: "POST",
    headers: {
      "X-CC-Api-Key": apiKey,
      "X-CC-Version": "2018-03-22",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `${planDetails.name} - Monthly Subscription`,
      description: `Subscribe to ${planDetails.name} plan`,
      pricing_type: "fixed_price",
      local_price: {
        amount: planDetails.amount,
        currency: "USD",
      },
      metadata: metadata,
      redirect_url: redirectUrl,
      cancel_url: cancelUrl,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Coinbase Commerce charge creation error:", errorText);
    throw new Error("Failed to create Coinbase Commerce charge");
  }

  const result = await response.json();
  const charge = result.data;

  return {
    chargeId: charge.id,
    hostedUrl: charge.hosted_url,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use anon key for user auth
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Use service role for reading gateway settings
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
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

    const { plan, successUrl, cancelUrl } = await req.json();

    if (!plan || !PLAN_PRICES[plan]) {
      throw new Error("Invalid plan selected");
    }

    // Get user's organization
    const { data: userRole } = await supabaseAdmin
      .from("user_roles")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!userRole?.organization_id) {
      throw new Error("User has no organization");
    }

    // Get Coinbase Commerce credentials from database
    const { apiKey } = await getCoinbaseCredentials(
      supabaseAdmin,
      userRole.organization_id
    );

    // Create Coinbase Commerce charge
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const { chargeId, hostedUrl } = await createCoinbaseCharge(
      apiKey,
      plan,
      successUrl || `${origin}/dashboard?payment=success&provider=crypto`,
      cancelUrl || `${origin}/pricing?payment=canceled`,
      {
        user_id: user.id,
        organization_id: userRole.organization_id,
        plan: plan,
        email: user.email || "",
      }
    );

    console.log(`Coinbase Commerce charge created: ${chargeId}`);

    return new Response(
      JSON.stringify({ 
        url: hostedUrl, 
        chargeId,
        provider: "crypto" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating Coinbase checkout:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
