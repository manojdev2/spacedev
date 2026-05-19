import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function usePayPalCapture() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    const capturePayPalOrder = async () => {
      const payment = searchParams.get("payment");
      const provider = searchParams.get("provider");
      const token = searchParams.get("token"); // PayPal order ID

      // Only capture if coming from PayPal with success
      if (payment === "success" && provider === "paypal" && token && !isCapturing) {
        setIsCapturing(true);

        try {
          const response = await supabase.functions.invoke("capture-paypal-order", {
            body: { orderId: token },
          });

          if (response.error) {
            throw new Error(response.error.message);
          }

          if (response.data?.success) {
            toast({
              title: "Payment Successful",
              description: "Your PayPal payment has been processed. Welcome to your new plan!",
            });
          } else {
            throw new Error("Payment capture failed");
          }
        } catch (error) {
          console.error("PayPal capture error:", error);
          toast({
            title: "Payment Error",
            description: error instanceof Error ? error.message : "Failed to process PayPal payment",
            variant: "destructive",
          });
        } finally {
          // Clean up URL params
          navigate("/dashboard", { replace: true });
        }
      }
    };

    capturePayPalOrder();
  }, [searchParams, navigate, toast, isCapturing]);

  return { isCapturing };
}
