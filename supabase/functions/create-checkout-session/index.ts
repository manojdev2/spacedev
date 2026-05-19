import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRICE_IDS: Record<string, string> = {
  starter: "price_1SweFUJh2B7XQiDFdXcDMMzi",
  professional: "price_1SweFVJh2B7XQiDFs4vlxoxF",
  enterprise: "price_1SweFWJh2B7XQiDFNLu5XC2R",
};

// Helper to get Stripe credentials from database or fallback to env
// deno-lint-ignore no-explicit-any
async function getStripeCredentials(
  supabaseAdmin: any,
  organizationId: string
): Promise<{ secretKey: string; isLiveMode: boolean }> {
  // Try to get organization's custom Stripe settings
  const { data: gatewaySettings } = await supabaseAdmin
    .from("payment_gateway_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("gateway_type", "stripe")
    .eq("is_enabled", true)
    .single();

  if (gatewaySettings) {
    const isLiveMode = Boolean(gatewaySettings.is_live_mode);
    const secretKey = isLiveMode 
      ? (gatewaySettings.live_secret_key as string | null)
      : (gatewaySettings.test_secret_key as string | null);
    
    if (secretKey) {
      console.log(`Using organization's ${isLiveMode ? 'live' : 'test'} Stripe credentials`);
      return { secretKey, isLiveMode };
    }
  }

  // Fallback to environment variable
  const envKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!envKey) {
    throw new Error("No Stripe credentials configured. Please configure Stripe in Settings > Payment Gateways.");
  }
  
  console.log("Using default Stripe credentials from environment");
  return { secretKey: envKey, isLiveMode: !envKey.startsWith("sk_test_") };
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

    const { plan, paymentMethod, successUrl, cancelUrl } = await req.json();

    if (!plan || !PRICE_IDS[plan]) {
      throw new Error("Invalid plan selected");
    }

    // Get user's organization first
    const { data: userRole } = await supabaseAdmin
      .from("user_roles")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!userRole?.organization_id) {
      throw new Error("User has no organization");
    }

    // Get Stripe credentials from database or fallback to env
    const { secretKey } = await getStripeCredentials(supabaseAdmin, userRole.organization_id);
    const stripe = new Stripe(secretKey, { apiVersion: "2023-10-16" });

    // Get or create customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
    }

    // Update organization with stripe customer id
    await supabaseAdmin
      .from("organizations")
      .update({ stripe_customer_id: customerId })
      .eq("id", userRole.organization_id);

    // Determine payment methods based on user selection
    let paymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = ["card"];
    
    if (paymentMethod === "bank_transfer") {
      paymentMethodTypes = ["us_bank_account"];
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: paymentMethodTypes,
      line_items: [
        {
          price: PRICE_IDS[plan],
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: successUrl || `${req.headers.get("origin")}/dashboard?payment=success`,
      cancel_url: cancelUrl || `${req.headers.get("origin")}/pricing?payment=canceled`,
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          user_id: user.id,
          organization_id: userRole?.organization_id || "",
          plan: plan,
        },
      },
      metadata: {
        user_id: user.id,
        organization_id: userRole?.organization_id || "",
        plan: plan,
        payment_method: paymentMethod || "stripe",
      },
    });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
