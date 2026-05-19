import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook that syncs the user's profile theme preference with the app's theme.
 * Should be used once at the app root level.
 */
export function useProfileTheme() {
  const { setTheme } = useTheme();

  useEffect(() => {
    async function loadThemeFromProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile?.preferences) {
        const prefs = profile.preferences as { theme?: 'light' | 'dark' | 'system' };
        if (prefs.theme) {
          setTheme(prefs.theme);
        }
      }
    }

    loadThemeFromProfile();

    // Listen for auth state changes to reload theme when user logs in/out
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        loadThemeFromProfile();
      } else if (event === 'SIGNED_OUT') {
        setTheme('system');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setTheme]);
}
