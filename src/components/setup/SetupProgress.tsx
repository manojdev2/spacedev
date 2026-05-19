import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SetupStep = 
  | 'environment'
  | 'admin'
  | 'identity'
  | 'settings'
  | 'email'
  | 'security'
  | 'complete';

interface SetupProgressProps {
  currentStep: SetupStep;
  completedSteps: SetupStep[];
}

const STEPS: { id: SetupStep; label: string }[] = [
  { id: 'environment', label: 'Environment' },
  { id: 'admin', label: 'Admin Account' },
  { id: 'identity', label: 'App Identity' },
  { id: 'settings', label: 'Settings' },
  { id: 'email', label: 'Email' },
  { id: 'security', label: 'Security' },
];

export function SetupProgress({ currentStep, completedSteps }: SetupProgressProps) {
  const currentIndex = STEPS.findIndex(s => s.id === currentStep);

  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          const isPast = index < currentIndex;

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300",
                    isCompleted
                      ? "bg-primary text-primary-foreground"
                      : isCurrent
                      ? "bg-primary/20 text-primary border-2 border-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    "mt-2 text-xs font-medium text-center hidden sm:block",
                    isCurrent ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 transition-colors duration-300",
                    isPast || isCompleted ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
