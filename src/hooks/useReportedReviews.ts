import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ReportedReview {
  id: string;
  review_id: string;
  user_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review: {
    id: string;
    title: string | null;
    content: string | null;
    rating: number;
    created_at: string;
    user_id: string;
    location: {
      id: string;
      name: string;
    };
  } | null;
}

export function useReportedReviews(status?: string) {
  return useQuery({
    queryKey: ['reported-reviews', status],
    queryFn: async () => {
      let query = supabase
        .from('review_reports')
        .select(`
          *,
          review:reviews (
            id,
            title,
            content,
            rating,
            created_at,
            user_id,
            location:locations (
              id,
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as ReportedReview[];
    },
  });
}

export function useUpdateReportStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      reportId, 
      status, 
      deleteReview = false 
    }: { 
      reportId: string; 
      status: 'resolved' | 'dismissed'; 
      deleteReview?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update report status
      const { error: updateError } = await supabase
        .from('review_reports')
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq('id', reportId);

      if (updateError) throw updateError;

      // If resolving and deleting the review
      if (deleteReview && status === 'resolved') {
        // Get the review_id first
        const { data: report } = await supabase
          .from('review_reports')
          .select('review_id')
          .eq('id', reportId)
          .single();

        if (report?.review_id) {
          const { error: deleteError } = await supabase
            .from('reviews')
            .delete()
            .eq('id', report.review_id);

          if (deleteError) throw deleteError;
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reported-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });
}
