import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserOrganization } from "@/hooks/useUserOrganization";
import type { Json } from "@/integrations/supabase/types";

export type GatewayType = "stripe" | "paypal" | "crypto";

export interface PaymentGatewaySettings {
  id: string;
  organization_id: string;
  gateway_type: GatewayType;
  is_enabled: boolean;
  is_live_mode: boolean;
  test_api_key: string | null;
  test_secret_key: string | null;
  test_webhook_secret: string | null;
  live_api_key: string | null;
  live_secret_key: string | null;
  live_webhook_secret: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface GatewayFormData {
  gateway_type: GatewayType;
  is_enabled: boolean;
  is_live_mode: boolean;
  test_api_key?: string;
  test_secret_key?: string;
  test_webhook_secret?: string;
  live_api_key?: string;
  live_secret_key?: string;
  live_webhook_secret?: string;
  settings?: Record<string, unknown>;
}

export function usePaymentGatewaySettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { organizationId } = useUserOrganization();

  const { data: gateways, isLoading } = useQuery({
    queryKey: ["payment-gateway-settings", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from("payment_gateway_settings")
        .select("*")
        .eq("organization_id", organizationId);

      if (error) throw error;
      return data as PaymentGatewaySettings[];
    },
    enabled: !!organizationId,
  });

  const upsertGateway = useMutation({
    mutationFn: async (formData: GatewayFormData) => {
      if (!organizationId) throw new Error("No organization ID");

      // Check if gateway exists
      const existing = gateways?.find(g => g.gateway_type === formData.gateway_type);

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from("payment_gateway_settings")
          .update({
            is_enabled: formData.is_enabled,
            is_live_mode: formData.is_live_mode,
            test_api_key: formData.test_api_key ?? existing.test_api_key,
            test_secret_key: formData.test_secret_key ?? existing.test_secret_key,
            test_webhook_secret: formData.test_webhook_secret ?? existing.test_webhook_secret,
            live_api_key: formData.live_api_key ?? existing.live_api_key,
            live_secret_key: formData.live_secret_key ?? existing.live_secret_key,
            live_webhook_secret: formData.live_webhook_secret ?? existing.live_webhook_secret,
            settings: formData.settings ?? existing.settings,
          } as Record<string, unknown>)
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("payment_gateway_settings")
          .insert([{
            organization_id: organizationId,
            gateway_type: formData.gateway_type,
            is_enabled: formData.is_enabled,
            is_live_mode: formData.is_live_mode,
            test_api_key: formData.test_api_key || null,
            test_secret_key: formData.test_secret_key || null,
            test_webhook_secret: formData.test_webhook_secret || null,
            live_api_key: formData.live_api_key || null,
            live_secret_key: formData.live_secret_key || null,
            live_webhook_secret: formData.live_webhook_secret || null,
            settings: (formData.settings ?? {}) as Json,
          }])
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["payment-gateway-settings"] });
      toast({
        title: "Gateway Updated",
        description: `${variables.gateway_type.charAt(0).toUpperCase() + variables.gateway_type.slice(1)} settings saved successfully.`,
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

  const getGatewayByType = (type: GatewayType): PaymentGatewaySettings | undefined => {
    return gateways?.find(g => g.gateway_type === type);
  };

  return {
    gateways,
    isLoading,
    upsertGateway,
    getGatewayByType,
  };
}
