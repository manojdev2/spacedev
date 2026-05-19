import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export function useCryptoCapture() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    const provider = searchParams.get("provider");

    // Only handle crypto payment redirects
    if (paymentStatus === "success" && provider === "crypto" && !isProcessing) {
      setIsProcessing(true);
      
      // Coinbase Commerce handles payment confirmation via webhook
      // Show success message and refresh subscription data
      toast({
        title: "Payment Submitted",
        description: "Your cryptocurrency payment is being processed. Your subscription will be activated once the payment is confirmed on the blockchain.",
      });

      // Invalidate subscription query to refresh data
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });

      // Clean up URL params
      searchParams.delete("payment");
      searchParams.delete("provider");
      setSearchParams(searchParams, { replace: true });
      
      setIsProcessing(false);
    }
  }, [searchParams, setSearchParams, toast, queryClient, isProcessing]);

  return { isProcessing };
}
