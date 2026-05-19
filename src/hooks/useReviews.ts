import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Review {
  id: string;
  location_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  content: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewWithProfile extends Review {
  display_name?: string;
}

export function useLocationReviews(locationId: string | undefined) {
  return useQuery({
    queryKey: ['reviews', locationId],
    queryFn: async () => {
      if (!locationId) return [];

      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('location_id', locationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Review[];
    },
    enabled: !!locationId,
  });
}

export function useLocationRatingStats(locationId: string | undefined) {
  return useQuery({
    queryKey: ['reviews', 'stats', locationId],
    queryFn: async () => {
      if (!locationId) return { average: 0, count: 0, distribution: [0, 0, 0, 0, 0] };

      const { data, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('location_id', locationId);

      if (error) throw error;

      const reviews = data || [];
      const count = reviews.length;
      
      if (count === 0) {
        return { average: 0, count: 0, distribution: [0, 0, 0, 0, 0] };
      }

      const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
      const average = sum / count;
      
      // Distribution: [1-star, 2-star, 3-star, 4-star, 5-star]
      const distribution = [0, 0, 0, 0, 0];
      reviews.forEach((r) => {
        distribution[r.rating - 1]++;
      });

      return { average, count, distribution };
    },
    enabled: !!locationId,
  });
}

export function useUserReview(locationId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['reviews', 'user', locationId, userId],
    queryFn: async () => {
      if (!locationId || !userId) return null;

      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('location_id', locationId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data as Review | null;
    },
    enabled: !!locationId && !!userId,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (review: {
      location_id: string;
      user_id: string;
      rating: number;
      title?: string;
      content?: string;
    }) => {
      const { data, error } = await supabase
        .from('reviews')
        .insert(review)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', variables.location_id] });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'stats', variables.location_id] });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'user', variables.location_id] });
    },
  });
}

export function useUpdateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      rating,
      title,
      content,
    }: {
      id: string;
      rating: number;
      title?: string;
      content?: string;
    }) => {
      const { data, error } = await supabase
        .from('reviews')
        .update({ rating, title, content })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', data.location_id] });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'stats', data.location_id] });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'user', data.location_id] });
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, locationId }: { id: string; locationId: string }) => {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { locationId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', result.locationId] });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'stats', result.locationId] });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'user', result.locationId] });
    },
  });
}
