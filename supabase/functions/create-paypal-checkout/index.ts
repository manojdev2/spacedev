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

// Helper to get PayPal credentials from database
// deno-lint-ignore no-explicit-any
async function getPayPalCredentials(
  supabaseAdmin: any,
  organizationId: string
): Promise<{ clientId: string; clientSecret: string; isLiveMode: boolean }> {
  const { data: gatewaySettings } = await supabaseAdmin
    .from("payment_gateway_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("gateway_type", "paypal")
    .eq("is_enabled", true)
    .single();

  if (!gatewaySettings) {
    throw new Error("PayPal is not configured. Please set up PayPal in Settings > Payment Gateways.");
  }

  const isLiveMode = Boolean(gatewaySettings.is_live_mode);
  const clientId = isLiveMode
    ? (gatewaySettings.live_api_key as string | null)
    : (gatewaySettings.test_api_key as string | null);
  const clientSecret = isLiveMode
    ? (gatewaySettings.live_secret_key as string | null)
    : (gatewaySettings.test_secret_key as string | null);

  if (!clientId || !clientSecret) {
    throw new Error(`PayPal ${isLiveMode ? "live" : "test"} credentials are not configured.`);
  }

  console.log(`Using organization's ${isLiveMode ? "live" : "sandbox"} PayPal credentials`);
  return { clientId, clientSecret, isLiveMode };
}

// Get PayPal access token
async function getPayPalAccessToken(
  clientId: string,
  clientSecret: string,
  isLiveMode: boolean
): Promise<string> {
  const baseUrl = isLiveMode
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

  const auth = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("PayPal auth error:", errorText);
    throw new Error("Failed to authenticate with PayPal");
  }

  const data = await response.json();
  return data.access_token;
}

// Create PayPal order
async function createPayPalOrder(
  accessToken: string,
  isLiveMode: boolean,
  plan: string,
  returnUrl: string,
  cancelUrl: string,
  metadata: Record<string, string>
): Promise<{ orderId: string; approvalUrl: string }> {
  const baseUrl = isLiveMode
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

  const planDetails = PLAN_PRICES[plan];

  const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: planDetails.amount,
          },
          description: `${planDetails.name} - Monthly Subscription`,
          custom_id: JSON.stringify(metadata),
        },
      ],
      application_context: {
        brand_name: "LocatePro",
        landing_page: "LOGIN",
        user_action: "PAY_NOW",
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("PayPal order creation error:", errorText);
    throw new Error("Failed to create PayPal order");
  }

  const order = await response.json();
  const approvalLink = order.links.find((link: { rel: string }) => link.rel === "approve");

  if (!approvalLink) {
    throw new Error("PayPal approval URL not found");
  }

  return {
    orderId: order.id,
    approvalUrl: approvalLink.href,
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

    // Get PayPal credentials from database
    const { clientId, clientSecret, isLiveMode } = await getPayPalCredentials(
      supabaseAdmin,
      userRole.organization_id
    );

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken(clientId, clientSecret, isLiveMode);

    // Create PayPal order
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const { orderId, approvalUrl } = await createPayPalOrder(
      accessToken,
      isLiveMode,
      plan,
      successUrl || `${origin}/dashboard?payment=success&provider=paypal`,
      cancelUrl || `${origin}/pricing?payment=canceled`,
      {
        user_id: user.id,
        organization_id: userRole.organization_id,
        plan: plan,
        email: user.email || "",
      }
    );

    console.log(`PayPal order created: ${orderId}`);

    return new Response(
      JSON.stringify({ 
        url: approvalUrl, 
        orderId,
        provider: "paypal" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating PayPal checkout:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
