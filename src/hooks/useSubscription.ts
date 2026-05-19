import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "unpaid" | "incomplete";
export type PaymentMethod = "stripe" | "paypal" | "crypto" | "bank_transfer";

export interface Subscription {
  id: string;
  organization_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  plan: "starter" | "professional" | "enterprise";
  status: SubscriptionStatus;
  payment_method: PaymentMethod;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  trial_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  organization_id: string;
  subscription_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_invoice_id: string | null;
  amount_cents: number;
  currency: string;
  payment_method: PaymentMethod;
  status: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function useSubscription() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subscription, isLoading: isLoadingSubscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!userRole?.organization_id) return null;

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("organization_id", userRole.organization_id)
        .maybeSingle();

      if (error) throw error;
      return data as Subscription | null;
    },
  });

  const { data: payments, isLoading: isLoadingPayments } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!userRole?.organization_id) return [];

      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("organization_id", userRole.organization_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Payment[];
    },
  });

  const createCheckoutSession = useMutation({
    mutationFn: async ({ plan, paymentMethod }: { plan: string; paymentMethod?: PaymentMethod }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Use PayPal checkout for PayPal payments
      if (paymentMethod === "paypal") {
        const response = await supabase.functions.invoke("create-paypal-checkout", {
          body: {
            plan,
            successUrl: `${window.location.origin}/dashboard?payment=success&provider=paypal`,
            cancelUrl: `${window.location.origin}/pricing?payment=canceled`,
          },
        });

        if (response.error) throw new Error(response.error.message);
        return response.data;
      }

      // Use Coinbase Commerce for crypto payments
      if (paymentMethod === "crypto") {
        const response = await supabase.functions.invoke("create-coinbase-checkout", {
          body: {
            plan,
            successUrl: `${window.location.origin}/dashboard?payment=success&provider=crypto`,
            cancelUrl: `${window.location.origin}/pricing?payment=canceled`,
          },
        });

        if (response.error) throw new Error(response.error.message);
        return response.data;
      }

      // Default to Stripe checkout
      const response = await supabase.functions.invoke("create-checkout-session", {
        body: {
          plan,
          paymentMethod: paymentMethod || "stripe",
          successUrl: `${window.location.origin}/dashboard?payment=success`,
          cancelUrl: `${window.location.origin}/pricing?payment=canceled`,
        },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Checkout Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const openBillingPortal = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("manage-subscription", {
        body: {
          action: "portal",
          returnUrl: `${window.location.origin}/dashboard/settings`,
        },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelSubscription = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("manage-subscription", {
        body: { action: "cancel" },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      toast({
        title: "Subscription Canceled",
        description: "Your subscription will remain active until the end of the billing period.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reactivateSubscription = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("manage-subscription", {
        body: { action: "reactivate" },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      toast({
        title: "Subscription Reactivated",
        description: "Your subscription has been reactivated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    subscription,
    payments,
    isLoading: isLoadingSubscription || isLoadingPayments,
    createCheckoutSession,
    openBillingPortal,
    cancelSubscription,
    reactivateSubscription,
  };
}
