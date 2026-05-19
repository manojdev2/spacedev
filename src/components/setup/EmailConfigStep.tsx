import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Mail, Send, CheckCircle2, Info } from 'lucide-react';

interface EmailConfigStepProps {
  onNext: (data: EmailConfigData) => void;
  onBack: () => void;
  initialData?: EmailConfigData;
}

export interface EmailConfigData {
  enableEmailNotifications: boolean;
  senderName: string;
  senderEmail: string;
  notifyOnSubmission: boolean;
  notifyOnApproval: boolean;
}

export function EmailConfigStep({ onNext, onBack, initialData }: EmailConfigStepProps) {
  const [formData, setFormData] = useState<EmailConfigData>({
    enableEmailNotifications: initialData?.enableEmailNotifications ?? true,
    senderName: initialData?.senderName || 'LocatePro',
    senderEmail: initialData?.senderEmail || '',
    notifyOnSubmission: initialData?.notifyOnSubmission ?? true,
    notifyOnApproval: initialData?.notifyOnApproval ?? true,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = () => {
    onNext(formData);
  };

  const handleSkip = () => {
    onNext({
      enableEmailNotifications: false,
      senderName: 'LocatePro',
      senderEmail: '',
      notifyOnSubmission: false,
      notifyOnApproval: false,
    });
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="text-xl">Email Configuration</CardTitle>
        <CardDescription>
          Set up email notifications for your store locator (optional - can be configured later)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-blue-500/10 border-blue-500/50">
          <Info className="w-4 h-4 text-blue-500" />
          <AlertDescription className="text-blue-700 dark:text-blue-400">
            Email is powered by Resend. An API key can be configured in Settings → Integrations.
          </AlertDescription>
        </Alert>

        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Enable Email Notifications
            </Label>
            <p className="text-xs text-muted-foreground">
              Send transactional emails to users
            </p>
          </div>
          <Switch
            checked={formData.enableEmailNotifications}
            onCheckedChange={(checked) => 
              setFormData(prev => ({ ...prev, enableEmailNotifications: checked }))
            }
          />
        </div>

        {formData.enableEmailNotifications && (
          <>
            <div className="space-y-2">
              <Label htmlFor="senderName">
                <Send className="w-4 h-4 inline mr-2" />
                Sender Name
              </Label>
              <Input
                id="senderName"
                name="senderName"
                placeholder="LocatePro"
                value={formData.senderName}
                onChange={handleInputChange}
              />
              <p className="text-xs text-muted-foreground">
                Name that appears in the "From" field of emails
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="senderEmail">
                <Mail className="w-4 h-4 inline mr-2" />
                Reply-To Email (Optional)
              </Label>
              <Input
                id="senderEmail"
                name="senderEmail"
                type="email"
                placeholder="support@yourcompany.com"
                value={formData.senderEmail}
                onChange={handleInputChange}
              />
              <p className="text-xs text-muted-foreground">
                Email address for customer replies
              </p>
            </div>

            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">Notification Triggers</p>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>New Store Submission</Label>
                  <p className="text-xs text-muted-foreground">
                    Alert admin when a user submits a store
                  </p>
                </div>
                <Switch
                  checked={formData.notifyOnSubmission}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, notifyOnSubmission: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Submission Approved/Rejected</Label>
                  <p className="text-xs text-muted-foreground">
                    Notify submitter when their store is reviewed
                  </p>
                </div>
                <Switch
                  checked={formData.notifyOnApproval}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, notifyOnApproval: checked }))
                  }
                />
              </div>
            </div>
          </>
        )}

        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            variant="ghost"
            onClick={handleSkip}
          >
            Skip
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1"
          >
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
