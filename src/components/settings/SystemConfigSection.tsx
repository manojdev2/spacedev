import { useState, useEffect } from 'react';
import { Settings2, Sparkles, Mail, Shield, Loader2, Save, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

interface AppIdentityConfig {
  app_name: string;
  tagline: string;
  primary_color: string;
  website_url: string;
}

interface SystemSettingsConfig {
  default_language: string;
  default_timezone: string;
  distance_unit: 'miles' | 'kilometers';
  allow_public_submissions: boolean;
  require_approval: boolean;
}

interface EmailConfig {
  enabled: boolean;
  sender_name: string;
  sender_email: string;
  notify_on_submission: boolean;
  notify_on_approval: boolean;
}

interface SecurityConfig {
  require_email_verification: boolean;
  session_timeout: string;
  enforce_strong_passwords: boolean;
  enable_rate_limiting: boolean;
}

const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Spanish' },
  { id: 'fr', label: 'French' },
  { id: 'de', label: 'German' },
  { id: 'pt', label: 'Portuguese' },
];

const TIMEZONES = [
  { id: 'UTC', label: 'UTC' },
  { id: 'America/New_York', label: 'Eastern Time (ET)' },
  { id: 'America/Chicago', label: 'Central Time (CT)' },
  { id: 'America/Denver', label: 'Mountain Time (MT)' },
  { id: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { id: 'Europe/London', label: 'London (GMT)' },
  { id: 'Europe/Paris', label: 'Paris (CET)' },
  { id: 'Asia/Tokyo', label: 'Tokyo (JST)' },
];

const SESSION_TIMEOUTS = [
  { id: '1h', label: '1 hour' },
  { id: '4h', label: '4 hours' },
  { id: '24h', label: '24 hours' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
];

interface SystemConfigSectionProps {
  isAdmin: boolean;
}

export function SystemConfigSection({ isAdmin }: SystemConfigSectionProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('identity');

  const [identity, setIdentity] = useState<AppIdentityConfig>({
    app_name: 'LocatePro',
    tagline: 'Know Where to Grow',
    primary_color: '#06b6d4',
    website_url: '',
  });

  const [settings, setSettings] = useState<SystemSettingsConfig>({
    default_language: 'en',
    default_timezone: 'UTC',
    distance_unit: 'miles',
    allow_public_submissions: true,
    require_approval: true,
  });

  const [email, setEmail] = useState<EmailConfig>({
    enabled: false,
    sender_name: 'LocatePro',
    sender_email: '',
    notify_on_submission: true,
    notify_on_approval: true,
  });

  const [security, setSecurity] = useState<SecurityConfig>({
    require_email_verification: true,
    session_timeout: '7d',
    enforce_strong_passwords: true,
    enable_rate_limiting: true,
  });

  useEffect(() => {
    async function fetchConfig() {
      try {
        const { data, error } = await supabase
          .from('system_config')
          .select('key, value')
          .in('key', ['app_identity', 'system_settings', 'email_config', 'security_config']);

        if (error) throw error;

        data?.forEach((item) => {
          const value = item.value as Record<string, unknown>;
          switch (item.key) {
            case 'app_identity':
              setIdentity(value as unknown as AppIdentityConfig);
              break;
            case 'system_settings':
              setSettings(value as unknown as SystemSettingsConfig);
              break;
            case 'email_config':
              setEmail(value as unknown as EmailConfig);
              break;
            case 'security_config':
              setSecurity(value as unknown as SecurityConfig);
              break;
          }
        });
      } catch (err) {
        console.error('Error fetching system config:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchConfig();
  }, []);

  const handleSave = async () => {
    if (!isAdmin) return;

    try {
      setIsSaving(true);

      const configs: { key: string; value: Json }[] = [
        { key: 'app_identity', value: identity as unknown as Json },
        { key: 'system_settings', value: settings as unknown as Json },
        { key: 'email_config', value: email as unknown as Json },
        { key: 'security_config', value: security as unknown as Json },
      ];

      for (const config of configs) {
        // Check if key exists
        const { data: existing } = await supabase
          .from('system_config')
          .select('id')
          .eq('key', config.key)
          .single();

        if (existing) {
          // Update existing
          const { error } = await supabase
            .from('system_config')
            .update({ value: config.value, updated_at: new Date().toISOString() })
            .eq('key', config.key);
          if (error) throw error;
        } else {
          // Insert new
          const { error } = await supabase
            .from('system_config')
            .insert([{ key: config.key, value: config.value }]);
          if (error) throw error;
        }
      }

      toast({
        title: 'Configuration saved',
        description: 'System configuration has been updated successfully.',
      });
    } catch (err) {
      console.error('Error saving config:', err);
      toast({
        title: 'Save failed',
        description: 'Failed to save configuration. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Settings2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold">System Configuration</h2>
          <p className="text-sm text-muted-foreground">Manage app identity, settings, email, and security</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="identity" className="gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Identity</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Email</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
        </TabsList>

        {/* App Identity Tab */}
        <TabsContent value="identity" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="appName">App Name</Label>
              <Input
                id="appName"
                value={identity.app_name}
                onChange={(e) => setIdentity(prev => ({ ...prev, app_name: e.target.value }))}
                placeholder="Your App Name"
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={identity.tagline}
                onChange={(e) => setIdentity(prev => ({ ...prev, tagline: e.target.value }))}
                placeholder="A catchy tagline"
                disabled={!isAdmin}
              />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={identity.primary_color}
                  onChange={(e) => setIdentity(prev => ({ ...prev, primary_color: e.target.value }))}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
                  disabled={!isAdmin}
                />
                <Input
                  value={identity.primary_color}
                  onChange={(e) => setIdentity(prev => ({ ...prev, primary_color: e.target.value }))}
                  className="max-w-[120px] font-mono uppercase"
                  maxLength={7}
                  disabled={!isAdmin}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="websiteUrl">Website URL</Label>
              <Input
                id="websiteUrl"
                type="url"
                value={identity.website_url}
                onChange={(e) => setIdentity(prev => ({ ...prev, website_url: e.target.value }))}
                placeholder="https://example.com"
                disabled={!isAdmin}
              />
            </div>
          </div>
        </TabsContent>

        {/* System Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Default Language</Label>
              <Select
                value={settings.default_language}
                onValueChange={(value) => setSettings(prev => ({ ...prev, default_language: value }))}
                disabled={!isAdmin}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.id} value={lang.id}>{lang.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Default Timezone</Label>
              <Select
                value={settings.default_timezone}
                onValueChange={(value) => setSettings(prev => ({ ...prev, default_timezone: value }))}
                disabled={!isAdmin}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.id} value={tz.id}>{tz.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Distance Unit</Label>
            <Select
              value={settings.distance_unit}
              onValueChange={(value: 'miles' | 'kilometers') => setSettings(prev => ({ ...prev, distance_unit: value }))}
              disabled={!isAdmin}
            >
              <SelectTrigger className="max-w-[200px]">
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="miles">Miles</SelectItem>
                <SelectItem value="kilometers">Kilometers</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <Label>Allow Public Submissions</Label>
                <p className="text-sm text-muted-foreground">Let anyone submit new locations</p>
              </div>
              <Switch
                checked={settings.allow_public_submissions}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, allow_public_submissions: checked }))}
                disabled={!isAdmin}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Require Approval</Label>
                <p className="text-sm text-muted-foreground">Review submissions before publishing</p>
              </div>
              <Switch
                checked={settings.require_approval}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, require_approval: checked }))}
                disabled={!isAdmin}
              />
            </div>
          </div>
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email" className="space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <Label>Enable Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Send emails for important events</p>
            </div>
            <Switch
              checked={email.enabled}
              onCheckedChange={(checked) => setEmail(prev => ({ ...prev, enabled: checked }))}
              disabled={!isAdmin}
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="senderName">Sender Name</Label>
              <Input
                id="senderName"
                value={email.sender_name}
                onChange={(e) => setEmail(prev => ({ ...prev, sender_name: e.target.value }))}
                placeholder="Your App Name"
                disabled={!isAdmin || !email.enabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senderEmail">Sender Email</Label>
              <Input
                id="senderEmail"
                type="email"
                value={email.sender_email}
                onChange={(e) => setEmail(prev => ({ ...prev, sender_email: e.target.value }))}
                placeholder="noreply@example.com"
                disabled={!isAdmin || !email.enabled}
              />
            </div>
          </div>
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {email.notify_on_submission ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <Label>New Submission Notifications</Label>
                  <p className="text-sm text-muted-foreground">Email when someone submits a location</p>
                </div>
              </div>
              <Switch
                checked={email.notify_on_submission}
                onCheckedChange={(checked) => setEmail(prev => ({ ...prev, notify_on_submission: checked }))}
                disabled={!isAdmin || !email.enabled}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {email.notify_on_approval ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <Label>Approval Notifications</Label>
                  <p className="text-sm text-muted-foreground">Email submitters when approved</p>
                </div>
              </div>
              <Switch
                checked={email.notify_on_approval}
                onCheckedChange={(checked) => setEmail(prev => ({ ...prev, notify_on_approval: checked }))}
                disabled={!isAdmin || !email.enabled}
              />
            </div>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <div className="space-y-2">
            <Label>Session Timeout</Label>
            <Select
              value={security.session_timeout}
              onValueChange={(value) => setSecurity(prev => ({ ...prev, session_timeout: value }))}
              disabled={!isAdmin}
            >
              <SelectTrigger className="max-w-[200px]">
                <SelectValue placeholder="Select timeout" />
              </SelectTrigger>
              <SelectContent>
                {SESSION_TIMEOUTS.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <Label>Require Email Verification</Label>
                <p className="text-sm text-muted-foreground">Users must verify email before signing in</p>
              </div>
              <Switch
                checked={security.require_email_verification}
                onCheckedChange={(checked) => setSecurity(prev => ({ ...prev, require_email_verification: checked }))}
                disabled={!isAdmin}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Enforce Strong Passwords</Label>
                <p className="text-sm text-muted-foreground">Require uppercase, number, and special character</p>
              </div>
              <Switch
                checked={security.enforce_strong_passwords}
                onCheckedChange={(checked) => setSecurity(prev => ({ ...prev, enforce_strong_passwords: checked }))}
                disabled={!isAdmin}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Rate Limiting</Label>
                <p className="text-sm text-muted-foreground">Limit API requests to prevent abuse</p>
              </div>
              <Switch
                checked={security.enable_rate_limiting}
                onCheckedChange={(checked) => setSecurity(prev => ({ ...prev, enable_rate_limiting: checked }))}
                disabled={!isAdmin}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      {isAdmin && (
        <div className="flex justify-end mt-6 pt-6 border-t border-border">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Configuration
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}