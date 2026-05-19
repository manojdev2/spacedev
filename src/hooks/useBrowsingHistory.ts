import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback, useEffect, useState } from 'react';

interface TrackViewParams {
  locationId: string;
  source?: 'direct' | 'search' | 'recommendation' | 'nearby';
}

export function useBrowsingHistory() {
  const [userId, setUserId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const trackViewMutation = useMutation({
    mutationFn: async ({ locationId, source = 'direct' }: TrackViewParams) => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('user_location_views')
        .insert({
          user_id: userId,
          location_id: locationId,
          source,
        })
        .select()
        .single();

      if (error) {
        // Silently fail - tracking is non-critical
        console.error('Failed to track view:', error);
        return null;
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate recommendations cache when user views a new store
      queryClient.invalidateQueries({ queryKey: ['store-recommendations'] });
    },
  });

  const trackView = useCallback(
    (locationId: string, source?: TrackViewParams['source']) => {
      if (userId) {
        trackViewMutation.mutate({ locationId, source });
      }
    },
    [userId, trackViewMutation]
  );

  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_location_views')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-recommendations'] });
    },
  });

  return {
    trackView,
    clearHistory: clearHistoryMutation.mutateAsync,
    isClearing: clearHistoryMutation.isPending,
    isAuthenticated: !!userId,
  };
}
