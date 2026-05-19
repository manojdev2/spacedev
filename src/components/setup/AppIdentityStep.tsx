import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette, Globe, FileText, ImageIcon } from 'lucide-react';

interface AppIdentityStepProps {
  onNext: (data: AppIdentityData) => void;
  onBack: () => void;
  initialData?: AppIdentityData;
}

export interface AppIdentityData {
  appName: string;
  tagline: string;
  primaryColor: string;
  websiteUrl: string;
}

export function AppIdentityStep({ onNext, onBack, initialData }: AppIdentityStepProps) {
  const [formData, setFormData] = useState<AppIdentityData>({
    appName: initialData?.appName || 'LocatePro',
    tagline: initialData?.tagline || 'Find locations near you',
    primaryColor: initialData?.primaryColor || '#3b82f6',
    websiteUrl: initialData?.websiteUrl || '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
      appName: 'LocatePro',
      tagline: 'Find locations near you',
      primaryColor: '#3b82f6',
      websiteUrl: '',
    });
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="text-xl">App Identity</CardTitle>
        <CardDescription>
          Customize how your store locator appears to users (optional - can be changed later)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="appName">
            <FileText className="w-4 h-4 inline mr-2" />
            Application Name
          </Label>
          <Input
            id="appName"
            name="appName"
            placeholder="LocatePro"
            value={formData.appName}
            onChange={handleInputChange}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tagline">
            <FileText className="w-4 h-4 inline mr-2" />
            Tagline
          </Label>
          <Textarea
            id="tagline"
            name="tagline"
            placeholder="Find locations near you"
            value={formData.tagline}
            onChange={handleInputChange}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="primaryColor">
            <Palette className="w-4 h-4 inline mr-2" />
            Brand Color
          </Label>
          <div className="flex gap-3">
            <Input
              id="primaryColor"
              name="primaryColor"
              type="color"
              value={formData.primaryColor}
              onChange={handleInputChange}
              className="w-16 h-10 p-1 cursor-pointer"
            />
            <Input
              value={formData.primaryColor}
              onChange={handleInputChange}
              name="primaryColor"
              placeholder="#3b82f6"
              className="flex-1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="websiteUrl">
            <Globe className="w-4 h-4 inline mr-2" />
            Website URL (Optional)
          </Label>
          <Input
            id="websiteUrl"
            name="websiteUrl"
            type="url"
            placeholder="https://yourcompany.com"
            value={formData.websiteUrl}
            onChange={handleInputChange}
          />
        </div>

        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Logo and favicon can be configured in Settings after setup
          </p>
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
