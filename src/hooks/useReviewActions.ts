import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ReviewHelpful {
  id: string;
  review_id: string;
  user_id: string;
  created_at: string;
}

export interface ReviewReport {
  id: string;
  review_id: string;
  user_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
}

// Fetch helpful counts for reviews of a location
export function useReviewHelpfuls(locationId: string | undefined) {
  return useQuery({
    queryKey: ['review-helpfuls', locationId],
    queryFn: async () => {
      if (!locationId) return {};

      // First get all review IDs for this location
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('id')
        .eq('location_id', locationId);

      if (reviewsError) throw reviewsError;

      const reviewIds = (reviews || []).map((r) => r.id);
      if (reviewIds.length === 0) return {};

      // Then get helpful counts
      const { data: helpfuls, error } = await supabase
        .from('review_helpfuls')
        .select('review_id')
        .in('review_id', reviewIds);

      if (error) throw error;

      // Aggregate by review_id
      const counts: Record<string, number> = {};
      (helpfuls || []).forEach((h) => {
        counts[h.review_id] = (counts[h.review_id] || 0) + 1;
      });

      return counts;
    },
    enabled: !!locationId,
  });
}

// Check if current user marked a review as helpful
export function useUserHelpfuls(locationId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['review-helpfuls', 'user', locationId, userId],
    queryFn: async () => {
      if (!locationId || !userId) return new Set<string>();

      // Get all review IDs for this location
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('id')
        .eq('location_id', locationId);

      if (reviewsError) throw reviewsError;

      const reviewIds = (reviews || []).map((r) => r.id);
      if (reviewIds.length === 0) return new Set<string>();

      const { data, error } = await supabase
        .from('review_helpfuls')
        .select('review_id')
        .eq('user_id', userId)
        .in('review_id', reviewIds);

      if (error) throw error;

      return new Set((data || []).map((h) => h.review_id));
    },
    enabled: !!locationId && !!userId,
  });
}

// Check if current user has reported a review
export function useUserReports(locationId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['review-reports', 'user', locationId, userId],
    queryFn: async () => {
      if (!locationId || !userId) return new Set<string>();

      // Get all review IDs for this location
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('id')
        .eq('location_id', locationId);

      if (reviewsError) throw reviewsError;

      const reviewIds = (reviews || []).map((r) => r.id);
      if (reviewIds.length === 0) return new Set<string>();

      const { data, error } = await supabase
        .from('review_reports')
        .select('review_id')
        .eq('user_id', userId)
        .in('review_id', reviewIds);

      if (error) throw error;

      return new Set((data || []).map((r) => r.review_id));
    },
    enabled: !!locationId && !!userId,
  });
}

export function useToggleHelpful() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reviewId,
      userId,
      isCurrentlyHelpful,
    }: {
      reviewId: string;
      userId: string;
      locationId: string;
      isCurrentlyHelpful: boolean;
    }) => {
      if (isCurrentlyHelpful) {
        const { error } = await supabase
          .from('review_helpfuls')
          .delete()
          .eq('review_id', reviewId)
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('review_helpfuls')
          .insert({ review_id: reviewId, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['review-helpfuls', variables.locationId] });
      queryClient.invalidateQueries({ queryKey: ['review-helpfuls', 'user', variables.locationId] });
    },
  });
}

export function useReportReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reviewId,
      userId,
      reason,
      details,
      locationId,
    }: {
      reviewId: string;
      userId: string;
      reason: string;
      details?: string;
      locationId: string;
    }) => {
      const { error } = await supabase
        .from('review_reports')
        .insert({ 
          review_id: reviewId, 
          user_id: userId, 
          reason,
          details: details || null,
        });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['review-reports', 'user', variables.locationId] });
    },
  });
}
