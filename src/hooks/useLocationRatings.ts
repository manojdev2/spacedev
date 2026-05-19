import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LocationRating {
  locationId: string;
  average: number;
  count: number;
}

export function useAllLocationRatings() {
  return useQuery({
    queryKey: ['reviews', 'all-ratings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('location_id, rating');

      if (error) throw error;

      // Aggregate ratings by location
      const ratingsMap = new Map<string, { sum: number; count: number }>();
      
      (data || []).forEach((review) => {
        const existing = ratingsMap.get(review.location_id) || { sum: 0, count: 0 };
        ratingsMap.set(review.location_id, {
          sum: existing.sum + review.rating,
          count: existing.count + 1,
        });
      });

      const result: Record<string, LocationRating> = {};
      ratingsMap.forEach((value, locationId) => {
        result[locationId] = {
          locationId,
          average: value.sum / value.count,
          count: value.count,
        };
      });

      return result;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}
