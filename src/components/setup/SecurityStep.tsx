import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Lock, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface SecurityStepProps {
  onNext: (data: SecurityData) => void;
  onBack: () => void;
  initialData?: SecurityData;
}

export interface SecurityData {
  requireEmailVerification: boolean;
  sessionTimeout: string;
  enforceStrongPasswords: boolean;
  enableRateLimiting: boolean;
}

export function SecurityStep({ onNext, onBack, initialData }: SecurityStepProps) {
  const [formData, setFormData] = useState<SecurityData>({
    requireEmailVerification: initialData?.requireEmailVerification ?? true,
    sessionTimeout: initialData?.sessionTimeout || '7d',
    enforceStrongPasswords: initialData?.enforceStrongPasswords ?? true,
    enableRateLimiting: initialData?.enableRateLimiting ?? true,
  });

  const handleSubmit = () => {
    onNext(formData);
  };

  const getSecurityScore = () => {
    let score = 0;
    if (formData.requireEmailVerification) score++;
    if (formData.enforceStrongPasswords) score++;
    if (formData.enableRateLimiting) score++;
    if (formData.sessionTimeout !== 'never') score++;
    return score;
  };

  const score = getSecurityScore();
  const scoreLabel = score <= 1 ? 'Low' : score <= 2 ? 'Medium' : score <= 3 ? 'Good' : 'Excellent';
  const scoreColor = score <= 1 ? 'text-destructive' : score <= 2 ? 'text-yellow-500' : 'text-green-500';

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="text-xl">Security Configuration</CardTitle>
        <CardDescription>
          Configure security settings for your installation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-muted/50 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <p className="font-medium">Security Score</p>
              <p className="text-xs text-muted-foreground">Based on your configuration</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${scoreColor}`}>{score}/4</p>
            <p className={`text-sm ${scoreColor}`}>{scoreLabel}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Require Email Verification
              </Label>
              <p className="text-xs text-muted-foreground">
                Users must verify email before signing in
              </p>
            </div>
            <Switch
              checked={formData.requireEmailVerification}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, requireEmailVerification: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Enforce Strong Passwords
              </Label>
              <p className="text-xs text-muted-foreground">
                Require uppercase, numbers, 8+ characters
              </p>
            </div>
            <Switch
              checked={formData.enforceStrongPasswords}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, enforceStrongPasswords: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Enable Rate Limiting
              </Label>
              <p className="text-xs text-muted-foreground">
                Protect against brute force attacks
              </p>
            </div>
            <Switch
              checked={formData.enableRateLimiting}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, enableRateLimiting: checked }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Session Timeout
            </Label>
            <Select
              value={formData.sessionTimeout}
              onValueChange={(value) => setFormData(prev => ({ ...prev, sessionTimeout: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 Hour</SelectItem>
                <SelectItem value="24h">24 Hours</SelectItem>
                <SelectItem value="7d">7 Days</SelectItem>
                <SelectItem value="30d">30 Days</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How long before users need to sign in again
            </p>
          </div>
        </div>

        {!formData.requireEmailVerification && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              Disabling email verification reduces security. Anyone can create accounts without verification.
            </AlertDescription>
          </Alert>
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
            onClick={handleSubmit}
            className="flex-1"
          >
            Complete Setup
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
