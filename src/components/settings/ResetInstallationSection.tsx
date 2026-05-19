import { useState } from 'react';
import { RotateCcw, AlertTriangle, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

type ResetStep = 'initial' | 'confirm-text' | 'email-sent' | 'verify-code';

export function ResetInstallationSection() {
  const [step, setStep] = useState<ResetStep>('initial');
  const [isLoading, setIsLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const resetState = () => {
    setStep('initial');
    setConfirmText('');
    setConfirmationCode('');
    setMaskedEmail('');
    setIsLoading(false);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetState();
    }
  };

  const handleRequestCode = async () => {
    if (confirmText !== 'RESET') {
      toast({
        title: 'Confirmation required',
        description: 'Please type RESET to confirm',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase.functions.invoke('request-reset-confirmation');

      if (error) throw error;

      setMaskedEmail(data.email || 'your email');
      setStep('email-sent');
      
      toast({
        title: 'Confirmation code sent',
        description: 'Check your email for the 6-digit code',
      });
      
      // Auto-advance to code entry after a moment
      setTimeout(() => setStep('verify-code'), 1500);
    } catch (error) {
      console.error('Error requesting confirmation:', error);
      toast({
        title: 'Request failed',
        description: error instanceof Error ? error.message : 'Failed to send confirmation code',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndReset = async () => {
    if (confirmationCode.length !== 6) {
      toast({
        title: 'Invalid code',
        description: 'Please enter the 6-digit code from your email',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);

      const { error } = await supabase.functions.invoke('reset-installation', {
        body: { confirmationCode },
      });

      if (error) throw error;

      toast({
        title: 'Installation reset',
        description: 'Redirecting to setup wizard...',
      });

      // Sign out and redirect to setup
      await supabase.auth.signOut();
      window.location.href = '/setup';
    } catch (error) {
      console.error('Error resetting installation:', error);
      toast({
        title: 'Reset failed',
        description: error instanceof Error ? error.message : 'Failed to reset installation',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderDialogContent = () => {
    switch (step) {
      case 'initial':
      case 'confirm-text':
        return (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Confirm Installation Reset
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  This will reset the installation status, requiring the setup wizard to be run again.
                  All current users will be signed out.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="confirm-reset">
                    Type <span className="font-mono font-bold">RESET</span> to continue
                  </Label>
                  <Input
                    id="confirm-reset"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                    placeholder="Type RESET"
                    className="font-mono"
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={resetState}>Cancel</AlertDialogCancel>
              <Button
                onClick={handleRequestCode}
                disabled={confirmText !== 'RESET' || isLoading}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Confirmation Code
                  </>
                )}
              </Button>
            </AlertDialogFooter>
          </>
        );

      case 'email-sent':
        return (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-primary">
                <Mail className="h-5 w-5" />
                Check Your Email
              </AlertDialogTitle>
              <AlertDialogDescription>
                <div className="flex flex-col items-center py-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Mail className="h-8 w-8 text-primary animate-pulse" />
                  </div>
                  <p className="text-center">
                    A confirmation code has been sent to <strong>{maskedEmail}</strong>
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
          </>
        );

      case 'verify-code':
        return (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <ShieldCheck className="h-5 w-5" />
                Enter Confirmation Code
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <p>
                  Enter the 6-digit code sent to <strong>{maskedEmail}</strong> to complete the reset.
                </p>
                <div className="flex justify-center py-4">
                  <InputOTP
                    maxLength={6}
                    value={confirmationCode}
                    onChange={setConfirmationCode}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  The code expires in 15 minutes
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button variant="outline" onClick={resetState}>
                Cancel
              </Button>
              <Button
                onClick={handleVerifyAndReset}
                disabled={confirmationCode.length !== 6 || isLoading}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Confirm Reset'
                )}
              </Button>
            </AlertDialogFooter>
          </>
        );
    }
  };

  return (
    <div className="p-6 rounded-xl border border-destructive/30 bg-destructive/5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
          <RotateCcw className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <h2 className="font-semibold text-destructive">Reset Installation</h2>
          <p className="text-sm text-muted-foreground">
            Reset the system to run the setup wizard again
          </p>
        </div>
      </div>

      <div className="mb-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-destructive mb-1">Warning: This action is irreversible</p>
            <ul className="text-muted-foreground space-y-1 list-disc list-inside">
              <li>All users will be signed out</li>
              <li>The setup wizard will be required to run again</li>
              <li>Existing data will be preserved but a new admin must be created</li>
              <li>Email confirmation is required for security</li>
            </ul>
          </div>
        </div>
      </div>

      <AlertDialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="w-full sm:w-auto">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Installation
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          {renderDialogContent()}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
