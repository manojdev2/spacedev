import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cc-webhook-signature",
};

// Verify Coinbase Commerce webhook signature using Web Crypto API
async function verifyWebhookSignature(
  payload: string,
  signature: string,
  webhookSecret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    const expectedSignature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    return signature === expectedSignature;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const signature = req.headers.get("x-cc-webhook-signature");
    const rawBody = await req.text();

    if (!signature) {
      console.error("No webhook signature provided");
      return new Response(
        JSON.stringify({ error: "No signature provided" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const event = JSON.parse(rawBody);
    const metadata = event.event?.data?.metadata;

    if (!metadata?.organization_id) {
      console.log("No organization_id in metadata, skipping verification");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get webhook secret for this organization
    const { data: gatewaySettings } = await supabaseAdmin
      .from("payment_gateway_settings")
      .select("*")
      .eq("organization_id", metadata.organization_id)
      .eq("gateway_type", "crypto")
      .eq("is_enabled", true)
      .single();

    if (!gatewaySettings) {
      console.error("No crypto gateway settings found for organization");
      return new Response(
        JSON.stringify({ error: "Gateway not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const webhookSecret = gatewaySettings.is_live_mode
      ? gatewaySettings.live_webhook_secret
      : gatewaySettings.test_webhook_secret;

    // Verify signature if webhook secret is configured
    if (webhookSecret) {
      const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.error("Invalid webhook signature");
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
    }

    const eventType = event.event?.type;
    const chargeData = event.event?.data;

    console.log(`Processing Coinbase webhook event: ${eventType}`);

    switch (eventType) {
      case "charge:confirmed":
      case "charge:resolved": {
        // Payment was successful
        const userId = metadata.user_id;
        const organizationId = metadata.organization_id;
        const plan = metadata.plan;
        const amountUsd = parseFloat(chargeData.pricing?.local?.amount || "0");
        const amountCents = Math.round(amountUsd * 100);

        // Get or create subscription
        const { data: existingSub } = await supabaseAdmin
          .from("subscriptions")
          .select("id")
          .eq("organization_id", organizationId)
          .single();

        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        if (existingSub) {
          // Update existing subscription
          await supabaseAdmin
            .from("subscriptions")
            .update({
              plan: plan,
              status: "active",
              payment_method: "crypto",
              current_period_start: now.toISOString(),
              current_period_end: periodEnd.toISOString(),
              cancel_at_period_end: false,
              canceled_at: null,
              trial_end: null,
              updated_at: now.toISOString(),
            })
            .eq("id", existingSub.id);

          // Record payment
          await supabaseAdmin.from("payments").insert({
            organization_id: organizationId,
            subscription_id: existingSub.id,
            amount_cents: amountCents,
            currency: "usd",
            payment_method: "crypto",
            status: "succeeded",
            description: `${plan} plan - Cryptocurrency payment`,
            metadata: {
              charge_id: chargeData.id,
              charge_code: chargeData.code,
              crypto_payments: chargeData.payments,
            },
          });
        } else {
          // Create new subscription
          const { data: newSub } = await supabaseAdmin
            .from("subscriptions")
            .insert({
              organization_id: organizationId,
              plan: plan,
              status: "active",
              payment_method: "crypto",
              current_period_start: now.toISOString(),
              current_period_end: periodEnd.toISOString(),
            })
            .select()
            .single();

          if (newSub) {
            await supabaseAdmin.from("payments").insert({
              organization_id: organizationId,
              subscription_id: newSub.id,
              amount_cents: amountCents,
              currency: "usd",
              payment_method: "crypto",
              status: "succeeded",
              description: `${plan} plan - Cryptocurrency payment`,
              metadata: {
                charge_id: chargeData.id,
                charge_code: chargeData.code,
                crypto_payments: chargeData.payments,
              },
            });
          }
        }

        // Update organization plan
        await supabaseAdmin
          .from("organizations")
          .update({ plan: plan })
          .eq("id", organizationId);

        console.log(`Crypto payment confirmed for org ${organizationId}, plan: ${plan}`);
        break;
      }

      case "charge:failed":
      case "charge:expired": {
        // Payment failed or expired
        console.log(`Crypto charge ${eventType}: ${chargeData.id}`);
        
        if (metadata?.organization_id) {
          // Record failed payment attempt
          await supabaseAdmin.from("payments").insert({
            organization_id: metadata.organization_id,
            amount_cents: Math.round(parseFloat(chargeData.pricing?.local?.amount || "0") * 100),
            currency: "usd",
            payment_method: "crypto",
            status: eventType === "charge:failed" ? "failed" : "expired",
            description: `${metadata.plan || "Unknown"} plan - Cryptocurrency payment ${eventType.split(":")[1]}`,
            metadata: {
              charge_id: chargeData.id,
              charge_code: chargeData.code,
            },
          });
        }
        break;
      }

      case "charge:pending": {
        console.log(`Crypto charge pending: ${chargeData.id}`);
        break;
      }

      default:
        console.log(`Unhandled Coinbase event type: ${eventType}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Coinbase webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
