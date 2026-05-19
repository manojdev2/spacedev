import { CreditCard, Building2, Bitcoin, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/hooks/useSubscription";

interface PaymentMethodSelectorProps {
  selected: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
  disabled?: boolean;
}

const paymentMethods: { id: PaymentMethod; label: string; icon: React.ReactNode; description: string; available: boolean }[] = [
  {
    id: "stripe",
    label: "Credit Card",
    icon: <CreditCard className="h-5 w-5" />,
    description: "Visa, Mastercard, Amex",
    available: true,
  },
  {
    id: "paypal",
    label: "PayPal",
    icon: <Building2 className="h-5 w-5" />,
    description: "Pay with PayPal account",
    available: true,
  },
  {
    id: "crypto",
    label: "Cryptocurrency",
    icon: <Bitcoin className="h-5 w-5" />,
    description: "Bitcoin, Ethereum, USDC",
    available: true,
  },
  {
    id: "bank_transfer",
    label: "Bank Transfer",
    icon: <Landmark className="h-5 w-5" />,
    description: "ACH or wire transfer",
    available: true,
  },
];

export function PaymentMethodSelector({ selected, onSelect, disabled }: PaymentMethodSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {paymentMethods.map((method) => (
        <button
          key={method.id}
          type="button"
          onClick={() => method.available && onSelect(method.id)}
          disabled={disabled || !method.available}
          className={cn(
            "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
            selected === method.id
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground/50",
            (!method.available || disabled) && "opacity-50 cursor-not-allowed"
          )}
        >
          {!method.available && (
            <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground rounded">
              Soon
            </span>
          )}
          <div className={cn(
            "p-2 rounded-lg",
            selected === method.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            {method.icon}
          </div>
          <div className="text-center">
            <p className="font-medium text-sm">{method.label}</p>
            <p className="text-xs text-muted-foreground">{method.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
