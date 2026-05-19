import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

export function useViewedLocationIds() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const query = useQuery({
    queryKey: ['viewed-location-ids', userId],
    queryFn: async (): Promise<Set<string>> => {
      if (!userId) return new Set();

      const { data: views, error } = await supabase
        .from('user_location_views')
        .select('location_id')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching viewed locations:', error);
        return new Set();
      }

      return new Set(views?.map(v => v.location_id) || []);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    viewedIds: query.data || new Set<string>(),
    isLoading: query.isLoading,
    isAuthenticated: !!userId,
  };
}
