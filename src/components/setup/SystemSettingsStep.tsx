import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Globe, MapPin, Clock, Users } from 'lucide-react';

interface SystemSettingsStepProps {
  onNext: (data: SystemSettingsData) => void;
  onBack: () => void;
  initialData?: SystemSettingsData;
}

export interface SystemSettingsData {
  defaultLanguage: string;
  defaultTimezone: string;
  distanceUnit: 'miles' | 'kilometers';
  allowPublicSubmissions: boolean;
  requireApproval: boolean;
}

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
];

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (US)' },
  { value: 'America/Chicago', label: 'Central Time (US)' },
  { value: 'America/Denver', label: 'Mountain Time (US)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Shanghai', label: 'Shanghai' },
  { value: 'Australia/Sydney', label: 'Sydney' },
];

export function SystemSettingsStep({ onNext, onBack, initialData }: SystemSettingsStepProps) {
  const [formData, setFormData] = useState<SystemSettingsData>({
    defaultLanguage: initialData?.defaultLanguage || 'en',
    defaultTimezone: initialData?.defaultTimezone || 'UTC',
    distanceUnit: initialData?.distanceUnit || 'miles',
    allowPublicSubmissions: initialData?.allowPublicSubmissions ?? true,
    requireApproval: initialData?.requireApproval ?? true,
  });

  const handleSubmit = () => {
    onNext(formData);
  };

  const handleSkip = () => {
    onNext({
      defaultLanguage: 'en',
      defaultTimezone: 'UTC',
      distanceUnit: 'miles',
      allowPublicSubmissions: true,
      requireApproval: true,
    });
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="text-xl">System Settings</CardTitle>
        <CardDescription>
          Configure regional and operational preferences (optional - can be changed later)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>
              <Globe className="w-4 h-4 inline mr-2" />
              Default Language
            </Label>
            <Select
              value={formData.defaultLanguage}
              onValueChange={(value) => setFormData(prev => ({ ...prev, defaultLanguage: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              <Clock className="w-4 h-4 inline mr-2" />
              Default Timezone
            </Label>
            <Select
              value={formData.defaultTimezone}
              onValueChange={(value) => setFormData(prev => ({ ...prev, defaultTimezone: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>
            <MapPin className="w-4 h-4 inline mr-2" />
            Distance Unit
          </Label>
          <Select
            value={formData.distanceUnit}
            onValueChange={(value: 'miles' | 'kilometers') => 
              setFormData(prev => ({ ...prev, distanceUnit: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="miles">Miles</SelectItem>
              <SelectItem value="kilometers">Kilometers</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Allow Public Store Submissions
              </Label>
              <p className="text-xs text-muted-foreground">
                Let users submit new store locations for review
              </p>
            </div>
            <Switch
              checked={formData.allowPublicSubmissions}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, allowPublicSubmissions: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Admin Approval</Label>
              <p className="text-xs text-muted-foreground">
                Review submissions before they go live
              </p>
            </div>
            <Switch
              checked={formData.requireApproval}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, requireApproval: checked }))
              }
              disabled={!formData.allowPublicSubmissions}
            />
          </div>
        </div>

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
