import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

interface Favorite {
  id: string;
  user_id: string;
  location_id: string;
  created_at: string;
}

export function useFavorites() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null);
      setIsAuthLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
      setIsAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['favorites', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      return data as Favorite[];
    },
    enabled: !!userId,
  });

  const addFavorite = useMutation({
    mutationFn: async (locationId: string) => {
      if (!userId) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('favorites')
        .insert({ user_id: userId, location_id: locationId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', userId] });
    },
  });

  const removeFavorite = useMutation({
    mutationFn: async (locationId: string) => {
      if (!userId) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('location_id', locationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', userId] });
    },
  });

  const isFavorite = (locationId: string) => {
    return favorites.some(fav => fav.location_id === locationId);
  };

  const toggleFavorite = async (locationId: string) => {
    if (isFavorite(locationId)) {
      await removeFavorite.mutateAsync(locationId);
    } else {
      await addFavorite.mutateAsync(locationId);
    }
  };

  return {
    favorites,
    isLoading: isLoading || isAuthLoading,
    isAuthLoading,
    isAuthenticated: !!userId,
    isFavorite,
    toggleFavorite,
    isToggling: addFavorite.isPending || removeFavorite.isPending,
  };
}
