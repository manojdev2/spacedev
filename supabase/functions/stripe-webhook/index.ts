import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const planLimits: Record<string, number> = {
  starter: 25,
  professional: 100,
  enterprise: 999999,
};

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    return new Response("Missing signature or webhook secret", { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const { user_id, organization_id, plan, payment_method } = session.metadata || {};

        if (organization_id && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

          // Create subscription record
          await supabaseAdmin.from("subscriptions").upsert({
            organization_id,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: session.customer as string,
            plan: plan as "starter" | "professional" | "enterprise",
            status: subscription.status === "active" ? "active" : subscription.status === "trialing" ? "trialing" : "incomplete",
            payment_method: (payment_method as "stripe" | "paypal" | "crypto" | "bank_transfer") || "stripe",
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          }, { onConflict: "organization_id" });

          // Update organization plan
          await supabaseAdmin.from("organizations").update({
            plan: plan as "starter" | "professional" | "enterprise",
            max_locations: planLimits[plan || "starter"],
            stripe_customer_id: session.customer as string,
          }).eq("id", organization_id);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const { organization_id, plan } = subscription.metadata || {};

        if (organization_id) {
          await supabaseAdmin.from("subscriptions").update({
            status: subscription.status as "active" | "trialing" | "past_due" | "canceled" | "unpaid" | "incomplete",
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
          }).eq("stripe_subscription_id", subscription.id);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await supabaseAdmin.from("subscriptions").update({
          status: "canceled",
          canceled_at: new Date().toISOString(),
        }).eq("stripe_subscription_id", subscription.id);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        
        if (invoice.subscription) {
          const { data: sub } = await supabaseAdmin
            .from("subscriptions")
            .select("id, organization_id")
            .eq("stripe_subscription_id", invoice.subscription)
            .single();

          if (sub) {
            await supabaseAdmin.from("payments").insert({
              organization_id: sub.organization_id,
              subscription_id: sub.id,
              stripe_invoice_id: invoice.id,
              stripe_payment_intent_id: invoice.payment_intent as string,
              amount_cents: invoice.amount_paid,
              currency: invoice.currency,
              payment_method: "stripe",
              status: "succeeded",
              description: `Payment for ${invoice.lines.data[0]?.description || "subscription"}`,
            });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        
        if (invoice.subscription) {
          const { data: sub } = await supabaseAdmin
            .from("subscriptions")
            .select("id, organization_id")
            .eq("stripe_subscription_id", invoice.subscription)
            .single();

          if (sub) {
            await supabaseAdmin.from("subscriptions").update({
              status: "past_due",
            }).eq("id", sub.id);

            await supabaseAdmin.from("payments").insert({
              organization_id: sub.organization_id,
              subscription_id: sub.id,
              stripe_invoice_id: invoice.id,
              amount_cents: invoice.amount_due,
              currency: invoice.currency,
              payment_method: "stripe",
              status: "failed",
              description: `Failed payment for ${invoice.lines.data[0]?.description || "subscription"}`,
            });
          }
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 400 }
    );
  }
});
