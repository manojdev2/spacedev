import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

export interface StoreRecommendation {
  locationId: string;
  name: string;
  city: string;
  state: string;
  category: string;
  reason: string;
  score: number;
}

interface RecommendationsResponse {
  recommendations: StoreRecommendation[];
  personalized: boolean;
  message?: string;
  error?: string;
}

export function useStoreRecommendations(limit = 5) {
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

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['store-recommendations', userId, limit],
    queryFn: async (): Promise<RecommendationsResponse> => {
      const { data, error } = await supabase.functions.invoke('get-store-recommendations', {
        body: { limit },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    recommendations: data?.recommendations || [],
    isPersonalized: data?.personalized ?? false,
    message: data?.message,
    isLoading,
    error: error as Error | null,
    isAuthenticated: !!userId,
    refetch,
  };
}
