import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Available amenities that users can save as preferences
export const AVAILABLE_AMENITIES = [
  { id: 'wifi', label: 'WiFi' },
  { id: 'parking', label: 'Parking' },
  { id: 'restrooms', label: 'Restrooms' },
  { id: 'drive-through', label: 'Drive-through' },
  { id: 'ev-charging', label: 'EV Charging' },
  { id: 'cafe', label: 'Café' },
  { id: 'pet-friendly', label: 'Pet Friendly' },
  { id: 'curbside-pickup', label: 'Curbside Pickup' },
  { id: 'wheelchair-accessible', label: 'Wheelchair Accessible' },
  { id: 'outdoor-seating', label: 'Outdoor Seating' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'atm', label: 'ATM' },
] as const;

export type AmenityId = typeof AVAILABLE_AMENITIES[number]['id'];

interface UseAmenityPreferencesResult {
  preferredAmenities: AmenityId[];
  isLoading: boolean;
  isSaving: boolean;
  toggleAmenity: (amenityId: AmenityId) => void;
  setPreferredAmenities: (amenities: AmenityId[]) => void;
  savePreferences: () => Promise<boolean>;
  hasChanges: boolean;
}

export function useAmenityPreferences(): UseAmenityPreferencesResult {
  const [preferredAmenities, setPreferredAmenities] = useState<AmenityId[]>([]);
  const [savedAmenities, setSavedAmenities] = useState<AmenityId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Fetch preferences on mount
  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching amenity preferences:', error);
        return;
      }

      if (data?.preferences) {
        const prefs = data.preferences as { preferred_amenities?: AmenityId[] };
        const amenities = prefs.preferred_amenities || [];
        setPreferredAmenities(amenities);
        setSavedAmenities(amenities);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAmenity = useCallback((amenityId: AmenityId) => {
    setPreferredAmenities(prev => 
      prev.includes(amenityId)
        ? prev.filter(a => a !== amenityId)
        : [...prev, amenityId]
    );
  }, []);

  const savePreferences = async (): Promise<boolean> => {
    try {
      setIsSaving(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in to save preferences',
          variant: 'destructive',
        });
        return false;
      }

      // Get current preferences first
      const { data: profileData } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      const currentPrefs = (profileData?.preferences as Record<string, unknown>) || {};

      // Merge with new amenity preferences
      const { error } = await supabase
        .from('profiles')
        .update({
          preferences: {
            ...currentPrefs,
            preferred_amenities: preferredAmenities,
          }
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error saving amenity preferences:', error);
        toast({
          title: 'Error',
          description: 'Failed to save amenity preferences',
          variant: 'destructive',
        });
        return false;
      }

      setSavedAmenities(preferredAmenities);
      toast({
        title: 'Saved',
        description: 'Your amenity preferences have been saved',
      });
      return true;
    } catch (err) {
      console.error('Error:', err);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = JSON.stringify(preferredAmenities.sort()) !== JSON.stringify(savedAmenities.sort());

  return {
    preferredAmenities,
    isLoading,
    isSaving,
    toggleAmenity,
    setPreferredAmenities,
    savePreferences,
    hasChanges,
  };
}

// Standalone function to get saved amenities (for use in SmartSearchBar)
export async function getSavedAmenityPreferences(): Promise<AmenityId[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data?.preferences) return [];

    const prefs = data.preferences as { preferred_amenities?: AmenityId[] };
    return prefs.preferred_amenities || [];
  } catch {
    return [];
  }
}
