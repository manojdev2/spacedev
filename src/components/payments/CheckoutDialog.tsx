import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PaymentMethodSelector } from "./PaymentMethodSelector";
import { useSubscription, type PaymentMethod } from "@/hooks/useSubscription";
import { CheckCircle2, Loader2, Shield } from "lucide-react";

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: {
    name: string;
    price: string;
    period: string;
    features: string[];
  };
  planKey: "starter" | "professional" | "enterprise";
}

export function CheckoutDialog({ open, onOpenChange, plan, planKey }: CheckoutDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("stripe");
  const { createCheckoutSession } = useSubscription();

  const handleCheckout = () => {
    createCheckoutSession.mutate({ plan: planKey, paymentMethod });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete your subscription</DialogTitle>
          <DialogDescription>
            Subscribe to {plan.name} for {plan.price}{plan.period}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Plan Summary */}
          <div className="p-4 rounded-xl bg-muted/50 border">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">{plan.name}</h3>
              <div className="text-right">
                <span className="text-2xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground text-sm">{plan.period}</span>
              </div>
            </div>
            <ul className="space-y-1.5">
              {plan.features.slice(0, 3).map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Payment Method Selection */}
          <div>
            <h4 className="font-medium mb-3">Select payment method</h4>
            <PaymentMethodSelector
              selected={paymentMethod}
              onSelect={setPaymentMethod}
              disabled={createCheckoutSession.isPending}
            />
          </div>

          {/* Security Badge */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Your payment is secured with 256-bit SSL encryption</span>
          </div>

          {/* CTA */}
          <Button
            onClick={handleCheckout}
            disabled={createCheckoutSession.isPending}
            className="w-full"
            variant="hero"
            size="lg"
          >
            {createCheckoutSession.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>Start 14-Day Free Trial</>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            You won't be charged until after your trial ends. Cancel anytime.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
