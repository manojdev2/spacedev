import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SetupProgress, type SetupStep } from '@/components/setup/SetupProgress';
import { EnvironmentCheckStep } from '@/components/setup/EnvironmentCheckStep';
import { AdminAccountStep, type AdminData } from '@/components/setup/AdminAccountStep';
import { AppIdentityStep, type AppIdentityData } from '@/components/setup/AppIdentityStep';
import { SystemSettingsStep, type SystemSettingsData } from '@/components/setup/SystemSettingsStep';
import { EmailConfigStep, type EmailConfigData } from '@/components/setup/EmailConfigStep';
import { SecurityStep, type SecurityData } from '@/components/setup/SecurityStep';
import { SetupCompleteStep } from '@/components/setup/SetupCompleteStep';
import { useSystemSetup } from '@/hooks/useSystemSetup';
import logo from '@/assets/locatepro-logo.png';

export interface SetupData {
  admin?: AdminData;
  identity?: AppIdentityData;
  settings?: SystemSettingsData;
  email?: EmailConfigData;
  security?: SecurityData;
}

export function SetupPage() {
  const navigate = useNavigate();
  const { isSetupComplete, isLoading } = useSystemSetup();
  const [currentStep, setCurrentStep] = useState<SetupStep | 'welcome'>('welcome');
  const [completedSteps, setCompletedSteps] = useState<SetupStep[]>([]);
  const [setupData, setSetupData] = useState<SetupData>({});

  // Redirect to login if setup is already complete
  useEffect(() => {
    if (!isLoading && isSetupComplete) {
      navigate('/login', { replace: true });
    }
  }, [isSetupComplete, isLoading, navigate]);

  const markStepComplete = (step: SetupStep) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps(prev => [...prev, step]);
    }
  };

  const handleEnvironmentComplete = () => {
    markStepComplete('environment');
    setCurrentStep('admin');
  };

  const handleAdminComplete = (data: AdminData) => {
    setSetupData(prev => ({ ...prev, admin: data }));
    markStepComplete('admin');
    setCurrentStep('identity');
  };

  const handleIdentityComplete = (data: AppIdentityData) => {
    setSetupData(prev => ({ ...prev, identity: data }));
    markStepComplete('identity');
    setCurrentStep('settings');
  };

  const handleSettingsComplete = (data: SystemSettingsData) => {
    setSetupData(prev => ({ ...prev, settings: data }));
    markStepComplete('settings');
    setCurrentStep('email');
  };

  const handleEmailComplete = (data: EmailConfigData) => {
    setSetupData(prev => ({ ...prev, email: data }));
    markStepComplete('email');
    setCurrentStep('security');
  };

  const handleSecurityComplete = (data: SecurityData) => {
    setSetupData(prev => ({ ...prev, security: data }));
    markStepComplete('security');
    setCurrentStep('complete');
  };

  // Show loading while checking setup status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src={logo} alt="LocatePro" className="h-10" />
        </div>

        {/* Progress indicator - only show after welcome */}
        {currentStep !== 'welcome' && currentStep !== 'complete' && (
          <SetupProgress 
            currentStep={currentStep} 
            completedSteps={completedSteps} 
          />
        )}

        {/* Welcome Step */}
        {currentStep === 'welcome' && (
          <Card className="border-2">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Welcome to LocatePro</CardTitle>
              <CardDescription className="text-base">
                This appears to be a fresh installation. Let's configure your store locator platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Setup includes:</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">1</div>
                    <span>Environment validation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">2</div>
                    <span>Super Admin account creation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">3</div>
                    <span>App identity & branding</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">4</div>
                    <span>System settings</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">5</div>
                    <span>Email configuration</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">6</div>
                    <span>Security settings</span>
                  </li>
                </ul>
              </div>
              <Button 
                onClick={() => setCurrentStep('environment')} 
                className="w-full" 
                size="lg"
              >
                Start Setup
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Environment Check Step */}
        {currentStep === 'environment' && (
          <EnvironmentCheckStep onNext={handleEnvironmentComplete} />
        )}

        {/* Admin Account Step */}
        {currentStep === 'admin' && (
          <AdminAccountStep 
            onNext={handleAdminComplete}
            onBack={() => setCurrentStep('environment')}
            initialData={setupData.admin}
          />
        )}

        {/* App Identity Step */}
        {currentStep === 'identity' && (
          <AppIdentityStep
            onNext={handleIdentityComplete}
            onBack={() => setCurrentStep('admin')}
            initialData={setupData.identity}
          />
        )}

        {/* System Settings Step */}
        {currentStep === 'settings' && (
          <SystemSettingsStep
            onNext={handleSettingsComplete}
            onBack={() => setCurrentStep('identity')}
            initialData={setupData.settings}
          />
        )}

        {/* Email Config Step */}
        {currentStep === 'email' && (
          <EmailConfigStep
            onNext={handleEmailComplete}
            onBack={() => setCurrentStep('settings')}
            initialData={setupData.email}
          />
        )}

        {/* Security Step */}
        {currentStep === 'security' && (
          <SecurityStep
            onNext={handleSecurityComplete}
            onBack={() => setCurrentStep('email')}
            initialData={setupData.security}
          />
        )}

        {/* Complete Step */}
        {currentStep === 'complete' && (
          <SetupCompleteStep 
            adminEmail={setupData.admin?.adminEmail || ''} 
            setupData={setupData}
          />
        )}
      </div>
    </div>
  );
}
