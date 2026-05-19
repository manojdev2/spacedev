import { useState, useEffect } from 'react';
import { User, Save, Loader2, Volume2, Bell } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { WhatsAppNotificationSettings } from '@/components/dashboard/WhatsAppNotificationSettings';
import { AmenityPreferencesCard } from '@/components/profile/AmenityPreferencesCard';
import { useAmenityPreferences, AmenityId } from '@/hooks/useAmenityPreferences';

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
    sound_enabled: boolean;
    preferred_amenities?: AmenityId[];
  };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [notifications, setNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const { toast } = useToast();
  const { setTheme: setAppTheme } = useTheme();
  
  const {
    preferredAmenities,
    isLoading: amenitiesLoading,
    toggleAmenity,
    hasChanges: amenityChanges,
  } = useAmenityPreferences();

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setUserEmail(user.email ?? null);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: 'Error',
          description: 'Failed to load profile',
          variant: 'destructive',
        });
        return;
      }

      if (data) {
        setProfile(data as unknown as Profile);
        setDisplayName(data.display_name || '');
        const prefs = data.preferences as Profile['preferences'];
        setTheme(prefs?.theme || 'system');
        setNotifications(prefs?.notifications ?? true);
        setSoundEnabled(prefs?.sound_enabled ?? true);
      } else {
        // Create profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            display_name: user.email?.split('@')[0] || '',
            preferences: { theme: 'system', notifications: true, sound_enabled: true }
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
        } else if (newProfile) {
          setProfile(newProfile as unknown as Profile);
          setDisplayName(newProfile.display_name || '');
        }
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!profile) return;

    try {
      setIsSaving(true);

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          preferences: { 
            theme, 
            notifications, 
            sound_enabled: soundEnabled,
            preferred_amenities: preferredAmenities,
          }
        })
        .eq('id', profile.id);

      if (error) {
        console.error('Error updating profile:', error);
        toast({
          title: 'Error',
          description: 'Failed to save profile',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>Update your display name and personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={userEmail || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
                maxLength={100}
              />
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Customize your experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select 
                value={theme} 
                onValueChange={(val) => {
                  const newTheme = val as typeof theme;
                  setTheme(newTheme);
                  setAppTheme(newTheme); // Apply immediately
                }}
              >
                <SelectTrigger id="theme">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications" className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Email Notifications
                </Label>
                <p className="text-xs text-muted-foreground">
                  Receive email updates about your locations
                </p>
              </div>
              <Switch
                id="notifications"
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="soundEnabled" className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  Notification Sounds
                </Label>
                <p className="text-xs text-muted-foreground">
                  Play audio alerts for new notifications
                </p>
              </div>
              <Switch
                id="soundEnabled"
                checked={soundEnabled}
                onCheckedChange={setSoundEnabled}
              />
            </div>
          </CardContent>
        </Card>
        {/* Preferred Amenities */}
        <div className="md:col-span-2">
          <AmenityPreferencesCard
            preferredAmenities={preferredAmenities}
            onToggle={toggleAmenity}
            isLoading={amenitiesLoading}
          />
        </div>

        {/* WhatsApp Notifications */}
        <div className="md:col-span-2">
          <WhatsAppNotificationSettings />
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
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
    </div>
  );
}
