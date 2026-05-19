import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { AltoEnergyPredictRequest, AltoEnergyResult } from "@/types/alto";

export function useAltoEnergyPredict() {
  return useMutation({
    mutationFn: async (request: AltoEnergyPredictRequest): Promise<AltoEnergyResult> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alto-energy-predict`,
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
        const err = await response.json().catch(() => ({ error: "Energy prediction failed" }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.prediction as AltoEnergyResult;
    },
    onError: (error) => {
      toast({
        title: "Prediction Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });
}
