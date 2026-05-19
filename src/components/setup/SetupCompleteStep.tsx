import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, ExternalLink, Mail, Rocket, Settings, MapPin, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import type { AppIdentityData } from './AppIdentityStep';
import type { SystemSettingsData } from './SystemSettingsStep';
import type { EmailConfigData } from './EmailConfigStep';
import type { SecurityData } from './SecurityStep';

interface SetupData {
  identity?: AppIdentityData;
  settings?: SystemSettingsData;
  email?: EmailConfigData;
  security?: SecurityData;
}

interface SetupCompleteStepProps {
  adminEmail: string;
  setupData: SetupData;
}

export function SetupCompleteStep({ adminEmail, setupData }: SetupCompleteStepProps) {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    saveConfiguration();
  }, []);

  const saveConfiguration = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const { data, error: saveError } = await supabase.functions.invoke('save-setup-config', {
        body: {
          identity: setupData.identity,
          settings: setupData.settings,
          email: setupData.email,
          security: setupData.security,
        },
      });

      if (saveError) {
        throw new Error(saveError.message || 'Failed to save configuration');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setSaved(true);
      console.log('[SetupCompleteStep] Configuration saved successfully');
    } catch (err) {
      console.error('[SetupCompleteStep] Error saving config:', err);
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const goToLogin = () => {
    navigate('/login');
  };

  return (
    <Card className="border-2 border-primary/30">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
          {isSaving ? (
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          ) : (
            <Rocket className="w-10 h-10 text-primary" />
          )}
        </div>
        <CardTitle className="text-2xl text-primary">
          {isSaving ? 'Saving Configuration...' : 'Setup Complete!'}
        </CardTitle>
        <CardDescription className="text-base">
          {isSaving 
            ? 'Saving your settings to the database' 
            : 'Your LocatePro installation is ready for launch'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button variant="link" onClick={saveConfiguration} className="ml-2 p-0 h-auto">
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {saved && (
          <Alert className="bg-green-500/10 border-green-500/50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 dark:text-green-400">
              All configuration has been saved successfully!
            </AlertDescription>
          </Alert>
        )}

        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-700 dark:text-yellow-400">
                Verify Your Email
              </p>
              <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-1">
                A verification email was sent to <strong>{adminEmail}</strong>. 
                Please click the link to activate your account.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="font-medium text-sm">Next Steps:</p>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                1
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Check your email</p>
                <p className="text-xs text-muted-foreground">Click the verification link</p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                2
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Sign in to dashboard</p>
                <p className="text-xs text-muted-foreground">Access the admin panel</p>
              </div>
              <Settings className="w-5 h-5 text-muted-foreground" />
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                3
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Add your first location</p>
                <p className="text-xs text-muted-foreground">Start building your store network</p>
              </div>
              <MapPin className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
        </div>

        <div className="pt-4 space-y-3">
          <Button 
            onClick={goToLogin} 
            className="w-full" 
            size="lg"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Go to Login
                <ExternalLink className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            You can configure additional settings in the dashboard
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
