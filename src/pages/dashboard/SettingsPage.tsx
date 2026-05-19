import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Building2, Palette, Globe, Lock, Upload, Loader2, Save, Image as ImageIcon } from 'lucide-react';
import { BillingSection } from '@/components/payments/BillingSection';
import { PaymentGatewaySettings } from '@/components/settings/PaymentGatewaySettings';
import { ResetInstallationSection } from '@/components/settings/ResetInstallationSection';
import { SystemConfigSection } from '@/components/settings/SystemConfigSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserOrganization } from '@/hooks/useUserOrganization';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface OrganizationSettings {
  id: string;
  name: string;
  logo: string | null;
  plan: string;
  max_locations: number;
}

interface AppearanceSettings {
  primaryColor: string;
  mapStyle: 'default' | 'dark' | 'minimal';
}

interface LocalizationSettings {
  language: string;
  distanceUnit: 'miles' | 'kilometers';
}

const MAP_STYLES = [
  { id: 'default', label: 'Default', description: 'Standard Google Maps style' },
  { id: 'dark', label: 'Dark', description: 'Dark mode map style' },
  { id: 'minimal', label: 'Minimal', description: 'Clean, minimal style' },
] as const;

const LANGUAGES = [
  { id: 'en-US', label: 'English (US)' },
  { id: 'en-GB', label: 'English (UK)' },
  { id: 'es', label: 'Spanish' },
  { id: 'fr', label: 'French' },
  { id: 'de', label: 'German' },
  { id: 'pt', label: 'Portuguese' },
];

export default function SettingsPage() {
  const { organizationId, role } = useUserOrganization();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Organization settings
  const [organization, setOrganization] = useState<OrganizationSettings | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  // Appearance settings (stored in localStorage for now)
  const [appearance, setAppearance] = useState<AppearanceSettings>({
    primaryColor: '#4F46E5',
    mapStyle: 'default',
  });
  
  // Localization settings (stored in localStorage for now)
  const [localization, setLocalization] = useState<LocalizationSettings>({
    language: 'en-US',
    distanceUnit: 'miles',
  });
  
  const isAdmin = role === 'admin';

  // Fetch organization data
  useEffect(() => {
    async function fetchOrganization() {
      if (!organizationId) {
        setIsLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', organizationId)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setOrganization(data);
          setCompanyName(data.name);
          setLogoUrl(data.logo);
          setLogoPreview(data.logo);
        }
      } catch (error) {
        console.error('Error fetching organization:', error);
        toast({
          title: 'Error',
          description: 'Failed to load organization settings',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchOrganization();
    
    // Load appearance and localization from localStorage
    const savedAppearance = localStorage.getItem('appearance-settings');
    const savedLocalization = localStorage.getItem('localization-settings');
    
    if (savedAppearance) {
      try {
        setAppearance(JSON.parse(savedAppearance));
      } catch (e) {
        console.error('Error parsing appearance settings:', e);
      }
    }
    
    if (savedLocalization) {
      try {
        setLocalization(JSON.parse(savedLocalization));
      } catch (e) {
        console.error('Error parsing localization settings:', e);
      }
    }
  }, [organizationId, toast]);

  // Handle logo upload
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !organizationId) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (PNG, JPG, etc.)',
        variant: 'destructive',
      });
      return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Logo must be less than 2MB',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsUploading(true);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setLogoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
      
      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${organizationId}/logo.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('location-photos')
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('location-photos')
        .getPublicUrl(fileName);
      
      setLogoUrl(publicUrl);
      
      toast({
        title: 'Logo uploaded',
        description: 'Your company logo has been updated',
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload logo. Please try again.',
        variant: 'destructive',
      });
      setLogoPreview(logoUrl); // Revert preview
    } finally {
      setIsUploading(false);
    }
  };

  // Handle save all settings
  const handleSave = async () => {
    if (!isAdmin) {
      toast({
        title: 'Permission denied',
        description: 'Only administrators can update settings',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsSaving(true);
      
      // Update organization in database
      if (organization) {
        const { error } = await supabase
          .from('organizations')
          .update({
            name: companyName.trim(),
            logo: logoUrl,
          })
          .eq('id', organization.id);
        
        if (error) throw error;
      }
      
      // Save appearance settings to localStorage
      localStorage.setItem('appearance-settings', JSON.stringify(appearance));
      
      // Save localization settings to localStorage
      localStorage.setItem('localization-settings', JSON.stringify(localization));
      
      toast({
        title: 'Settings saved',
        description: 'Your settings have been updated successfully.',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Save failed',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-3xl"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* Company Settings */}
      <div className="p-6 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Company Information</h2>
            <p className="text-sm text-muted-foreground">Update your company details</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your Company Name"
              disabled={!isAdmin}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Company Logo</Label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-muted border border-border flex items-center justify-center overflow-hidden">
                {logoPreview ? (
                  <img 
                    src={logoPreview} 
                    alt="Company logo" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!isAdmin || isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Logo
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">PNG, JPG up to 2MB</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="p-6 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <Palette className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h2 className="font-semibold">Appearance</h2>
            <p className="text-sm text-muted-foreground">Customize your locator look</p>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Primary Color</Label>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="color"
                  value={appearance.primaryColor}
                  onChange={(e) => setAppearance(prev => ({ ...prev, primaryColor: e.target.value }))}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
                  disabled={!isAdmin}
                />
              </div>
              <Input 
                value={appearance.primaryColor}
                onChange={(e) => setAppearance(prev => ({ ...prev, primaryColor: e.target.value }))}
                className="max-w-[120px] font-mono uppercase"
                maxLength={7}
                disabled={!isAdmin}
              />
            </div>
          </div>
          
          <div className="space-y-3">
            <Label>Map Style</Label>
            <div className="grid grid-cols-3 gap-3">
              {MAP_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => isAdmin && setAppearance(prev => ({ ...prev, mapStyle: style.id }))}
                  disabled={!isAdmin}
                  className={`p-4 rounded-lg border text-sm font-medium transition-all ${
                    appearance.mapStyle === style.id
                      ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  } ${!isAdmin ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Localization */}
      <div className="p-6 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
            <Globe className="h-5 w-5 text-success" />
          </div>
          <div>
            <h2 className="font-semibold">Localization</h2>
            <p className="text-sm text-muted-foreground">Language and region settings</p>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Language</Label>
            <Select 
              value={localization.language} 
              onValueChange={(value) => setLocalization(prev => ({ ...prev, language: value }))}
              disabled={!isAdmin}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.id} value={lang.id}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Distance Unit</Label>
            <Select 
              value={localization.distanceUnit} 
              onValueChange={(value: 'miles' | 'kilometers') => setLocalization(prev => ({ ...prev, distanceUnit: value }))}
              disabled={!isAdmin}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="miles">Miles</SelectItem>
                <SelectItem value="kilometers">Kilometers</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* System Configuration - Admin Only */}
      {isAdmin && <SystemConfigSection isAdmin={isAdmin} />}

      {/* Payment Gateway Configuration - Admin Only */}
      {isAdmin && <PaymentGatewaySettings isAdmin={isAdmin} />}

      {/* Subscription & Billing - Admin Only */}
      {isAdmin ? (
        <BillingSection />
      ) : (
        <div className="p-6 rounded-xl border border-border/50 bg-card opacity-60">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h2 className="font-semibold">Subscription & Billing</h2>
                <p className="text-sm text-muted-foreground">Manage your plan and billing</p>
              </div>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" />
              Admin only
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Only administrators can manage subscription and billing settings. Contact your organization admin for changes.
          </p>
        </div>
      )}

      {/* Reset Installation - Admin Only */}
      {isAdmin && <ResetInstallationSection />}

      {/* Save Button */}
      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving} className="bg-gradient-primary">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}
    </motion.div>
  );
}
