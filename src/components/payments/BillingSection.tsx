import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { 
  CreditCard, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink,
  Loader2,
  XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  active: { label: "Active", variant: "default", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  trialing: { label: "Trial", variant: "secondary", icon: <Calendar className="h-3.5 w-3.5" /> },
  past_due: { label: "Past Due", variant: "destructive", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  canceled: { label: "Canceled", variant: "outline", icon: <XCircle className="h-3.5 w-3.5" /> },
  unpaid: { label: "Unpaid", variant: "destructive", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  incomplete: { label: "Incomplete", variant: "outline", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
};

const planPrices: Record<string, string> = {
  starter: "$29",
  professional: "$79",
  enterprise: "$299",
};

export function BillingSection() {
  const { 
    subscription, 
    payments, 
    isLoading, 
    openBillingPortal, 
    cancelSubscription,
    reactivateSubscription 
  } = useSubscription();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Active Subscription</CardTitle>
          <CardDescription>
            You're currently on the free plan. Upgrade to unlock more features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="hero" asChild>
            <a href="/pricing">View Pricing Plans</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const status = statusConfig[subscription.status] || statusConfig.incomplete;
  const hasStripeSubscription = !!subscription.stripe_subscription_id;
  const isTrialWithoutStripe = subscription.status === 'trialing' && !hasStripeSubscription;

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current Plan</CardTitle>
            <Badge variant={status.variant} className="flex items-center gap-1">
              {status.icon}
              {status.label}
            </Badge>
          </div>
          <CardDescription>Manage your subscription and billing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border">
            <div>
              <h3 className="text-lg font-semibold capitalize">{subscription.plan}</h3>
              <p className="text-sm text-muted-foreground">
                {planPrices[subscription.plan]}/month
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                {subscription.cancel_at_period_end ? "Cancels on" : "Renews on"}
              </p>
              <p className="font-medium">
                {subscription.current_period_end 
                  ? format(new Date(subscription.current_period_end), "MMM d, yyyy")
                  : "N/A"
                }
              </p>
            </div>
          </div>

          {subscription.trial_end && new Date(subscription.trial_end) > new Date() && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-primary">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">
                Trial ends {format(new Date(subscription.trial_end), "MMM d, yyyy")}
              </span>
            </div>
          )}

          {subscription.cancel_at_period_end && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Your subscription will cancel at the end of the billing period</span>
            </div>
          )}

          {/* Show upgrade prompt for trial users without Stripe setup */}
          {isTrialWithoutStripe ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Complete your subscription setup to continue after your trial ends.
              </p>
              <Button variant="hero" asChild>
                <a href="/pricing">Choose a Plan</a>
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Button 
                variant="outline" 
                onClick={() => openBillingPortal.mutate()}
                disabled={openBillingPortal.isPending}
              >
                {openBillingPortal.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 h-4 w-4" />
                )}
                Manage Payment Methods
                <ExternalLink className="ml-2 h-3.5 w-3.5" />
              </Button>

              {subscription.cancel_at_period_end ? (
                <Button
                  variant="default"
                  onClick={() => reactivateSubscription.mutate()}
                  disabled={reactivateSubscription.isPending}
                >
                  {reactivateSubscription.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Reactivate Subscription
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => cancelSubscription.mutate()}
                  disabled={cancelSubscription.isPending}
                >
                  {cancelSubscription.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Cancel Subscription
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>View your recent transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {payments && payments.length > 0 ? (
            <div className="space-y-3">
              {payments.slice(0, 5).map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-full",
                      payment.status === "succeeded" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    )}>
                      {payment.status === "succeeded" ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{payment.description || "Payment"}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(payment.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      ${(payment.amount_cents / 100).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground uppercase">
                      {payment.currency}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No payment history yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
