import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Preferences {
  theme?: string;
  notifications?: boolean;
  sound_enabled?: boolean;
}

/**
 * Hook to fetch and manage the user's sound preference from their profile.
 * Returns whether sounds are enabled and a function to update the preference.
 */
export function useSoundPreference() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSoundPreference() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        const { data } = await supabase
          .from('profiles')
          .select('preferences')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data?.preferences) {
          const prefs = data.preferences as Preferences;
          setSoundEnabled(prefs.sound_enabled ?? true);
        }
      } catch (error) {
        console.error('Error fetching sound preference:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSoundPreference();

    // Listen for auth state changes to re-fetch preference
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchSoundPreference();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { soundEnabled, isLoading };
}
