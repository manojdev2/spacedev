import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { AltoRoute, AltoRouteOptimizeRequest } from "@/types/alto";

export function useAltoRouteOptimize() {
  return useMutation({
    mutationFn: async (request: AltoRouteOptimizeRequest): Promise<AltoRoute> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alto-route-optimize`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(request),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Route optimization failed" }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.route as AltoRoute;
    },
    onSuccess: (route) => {
      toast({
        title: "Route Optimized",
        description: `Risk score: ${Math.round(route.risk_score ?? 0)} · ${Math.round(route.sla_probability_pct ?? 0)}% on-time probability`,
      });
    },
    onError: (error) => {
      toast({
        title: "Optimization Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });
}
