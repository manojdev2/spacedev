import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, Sparkles } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';

const getTrialDaysRemaining = (trialEnd: string | null): number | null => {
  if (!trialEnd) return null;
  const now = new Date();
  const endDate = new Date(trialEnd);
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

export function TrialExpirationBanner() {
  const { subscription } = useSubscription();
  
  const isTrialing = subscription?.status === 'trialing';
  const trialDaysRemaining = isTrialing ? getTrialDaysRemaining(subscription?.trial_end ?? null) : null;
  
  // Only show banner if trialing and 3 days or less remaining
  if (!isTrialing || trialDaysRemaining === null || trialDaysRemaining > 3) {
    return null;
  }

  const isUrgent = trialDaysRemaining <= 1;
  
  return (
    <Alert 
      className={`border-2 ${
        isUrgent 
          ? 'border-destructive/50 bg-destructive/5' 
          : 'border-warning/50 bg-warning/5'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full ${isUrgent ? 'bg-destructive/10' : 'bg-warning/10'}`}>
          {isUrgent ? (
            <AlertTriangle className={`h-5 w-5 text-destructive`} />
          ) : (
            <Clock className={`h-5 w-5 text-warning`} />
          )}
        </div>
        <div className="flex-1">
          <AlertTitle className={`text-base font-semibold ${isUrgent ? 'text-destructive' : 'text-warning'}`}>
            {trialDaysRemaining === 0 
              ? 'Your trial expires today!' 
              : trialDaysRemaining === 1 
                ? 'Your trial expires tomorrow!' 
                : `Your trial expires in ${trialDaysRemaining} days`}
          </AlertTitle>
          <AlertDescription className="mt-1 text-muted-foreground">
            {isUrgent 
              ? "Upgrade now to keep access to all premium features including unlimited locations, store zone management, and analytics."
              : "Don't lose access to premium features. Upgrade to a paid plan to continue using all features."}
          </AlertDescription>
        </div>
        <Link to="/pricing">
          <Button 
            size="sm" 
            className={isUrgent ? 'bg-destructive hover:bg-destructive/90' : ''}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Upgrade Now
          </Button>
        </Link>
      </div>
    </Alert>
  );
}
