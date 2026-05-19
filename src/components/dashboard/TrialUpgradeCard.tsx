import { Link } from 'react-router-dom';
import { Sparkles, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useSubscription } from '@/hooks/useSubscription';

const getTrialDaysRemaining = (trialEnd: string | null): number | null => {
  if (!trialEnd) return null;
  const now = new Date();
  const endDate = new Date(trialEnd);
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

export function TrialUpgradeCard() {
  const { subscription } = useSubscription();
  
  const isTrialing = subscription?.status === 'trialing';
  const trialDaysRemaining = isTrialing ? getTrialDaysRemaining(subscription?.trial_end ?? null) : null;
  
  // Only show for trial users
  if (!isTrialing || trialDaysRemaining === null) {
    return null;
  }

  const totalTrialDays = 14;
  const daysUsed = totalTrialDays - trialDaysRemaining;
  const progressPercent = (daysUsed / totalTrialDays) * 100;
  const isUrgent = trialDaysRemaining <= 3;

  return (
    <Card className={`relative overflow-hidden border-2 ${
      isUrgent 
        ? 'border-destructive/30 bg-gradient-to-br from-destructive/5 to-destructive/10' 
        : 'border-primary/30 bg-gradient-to-br from-primary/5 to-accent/10'
    }`}>
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-accent/10 to-transparent rounded-tr-full" />
      
      <CardContent className="relative p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          {/* Left: Icon and Text */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${isUrgent ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                {isUrgent ? (
                  <Clock className={`h-6 w-6 text-destructive`} />
                ) : (
                  <Sparkles className={`h-6 w-6 text-primary`} />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {trialDaysRemaining === 0 
                    ? 'Your trial ends today!' 
                    : trialDaysRemaining === 1 
                      ? '1 day left in your trial' 
                      : `${trialDaysRemaining} days left in your trial`}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Upgrade to keep access to all premium features
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Trial progress</span>
                <span>{daysUsed} of {totalTrialDays} days used</span>
              </div>
              <Progress 
                value={progressPercent} 
                className={`h-2 ${isUrgent ? '[&>div]:bg-destructive' : ''}`}
              />
            </div>

            {/* Features reminder */}
            <div className="flex flex-wrap gap-2">
              {['Unlimited Locations', 'Store Zone Management', 'Analytics'].map((feature) => (
                <span 
                  key={feature}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-muted/50"
                >
                  <Zap className="h-3 w-3 text-primary" />
                  {feature}
                </span>
              ))}
            </div>
          </div>

          {/* Right: CTA */}
          <div className="flex flex-col gap-3 lg:items-end">
            <Link to="/pricing">
              <Button 
                size="lg" 
                className={isUrgent 
                  ? 'bg-destructive hover:bg-destructive/90 shadow-lg shadow-destructive/25' 
                  : 'shadow-lg shadow-primary/25'
                }
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Upgrade Now
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground text-center lg:text-right">
              Plans start at $29/month
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
