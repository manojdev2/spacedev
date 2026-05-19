import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    throw new Error("PayPal is not configured.");
  }

  const isLiveMode = Boolean(gatewaySettings.is_live_mode);
  const clientId = isLiveMode
    ? (gatewaySettings.live_api_key as string | null)
    : (gatewaySettings.test_api_key as string | null);
  const clientSecret = isLiveMode
    ? (gatewaySettings.live_secret_key as string | null)
    : (gatewaySettings.test_secret_key as string | null);

  if (!clientId || !clientSecret) {
    throw new Error(`PayPal credentials are not configured.`);
  }

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
    throw new Error("Failed to authenticate with PayPal");
  }

  const data = await response.json();
  return data.access_token;
}

// Capture PayPal order
async function capturePayPalOrder(
  accessToken: string,
  isLiveMode: boolean,
  orderId: string
): Promise<{ status: string; captureId: string; metadata: Record<string, string> }> {
  const baseUrl = isLiveMode
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

  const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("PayPal capture error:", errorText);
    throw new Error("Failed to capture PayPal payment");
  }

  const capture = await response.json();
  const captureDetails = capture.purchase_units?.[0]?.payments?.captures?.[0];
  
  // Parse custom_id metadata
  let metadata: Record<string, string> = {};
  try {
    const customId = capture.purchase_units?.[0]?.custom_id;
    if (customId) {
      metadata = JSON.parse(customId);
    }
  } catch {
    console.warn("Could not parse custom_id metadata");
  }

  return {
    status: capture.status,
    captureId: captureDetails?.id || "",
    metadata,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

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

    const { orderId } = await req.json();

    if (!orderId) {
      throw new Error("Order ID is required");
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

    // Get PayPal credentials
    const { clientId, clientSecret, isLiveMode } = await getPayPalCredentials(
      supabaseAdmin,
      userRole.organization_id
    );

    // Get access token and capture order
    const accessToken = await getPayPalAccessToken(clientId, clientSecret, isLiveMode);
    const { status, captureId, metadata } = await capturePayPalOrder(accessToken, isLiveMode, orderId);

    if (status === "COMPLETED") {
      console.log(`PayPal payment captured: ${captureId}`);

      // Record the payment
      const planPrices: Record<string, number> = {
        starter: 2900,
        professional: 7900,
        enterprise: 19900,
      };

      await supabaseAdmin.from("payments").insert({
        organization_id: userRole.organization_id,
        payment_method: "paypal",
        amount_cents: planPrices[metadata.plan] || 0,
        currency: "USD",
        status: "succeeded",
        description: `${metadata.plan} Plan - PayPal Payment`,
        metadata: {
          paypal_order_id: orderId,
          paypal_capture_id: captureId,
          plan: metadata.plan,
        },
      });

      // Update or create subscription
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);

      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const { data: existingSub } = await supabaseAdmin
        .from("subscriptions")
        .select("id")
        .eq("organization_id", userRole.organization_id)
        .single();

      if (existingSub) {
        await supabaseAdmin
          .from("subscriptions")
          .update({
            plan: metadata.plan as "starter" | "professional" | "enterprise",
            status: "trialing",
            payment_method: "paypal",
            trial_end: trialEnd.toISOString(),
            current_period_start: new Date().toISOString(),
            current_period_end: periodEnd.toISOString(),
          })
          .eq("id", existingSub.id);
      } else {
        await supabaseAdmin.from("subscriptions").insert({
          organization_id: userRole.organization_id,
          plan: metadata.plan as "starter" | "professional" | "enterprise",
          status: "trialing",
          payment_method: "paypal",
          trial_end: trialEnd.toISOString(),
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: status === "COMPLETED",
        status,
        captureId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error capturing PayPal order:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
