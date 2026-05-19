import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Notification {
  id: string;
  type: 'review' | 'submission' | 'report' | 'location';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const notifications: Notification[] = [];

      // Fetch recent reviews (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: reviews } = await supabase
        .from('reviews')
        .select('id, rating, title, created_at, location_id')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

      reviews?.forEach((review) => {
        notifications.push({
          id: `review-${review.id}`,
          type: 'review',
          title: 'New Review',
          message: review.title || `${review.rating}-star review received`,
          timestamp: review.created_at,
          read: false,
          link: `/location/${review.location_id}`,
        });
      });

      // Fetch pending submissions
      const { data: submissions } = await supabase
        .from('store_submissions')
        .select('id, business_name, created_at, status')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      submissions?.forEach((sub) => {
        notifications.push({
          id: `submission-${sub.id}`,
          type: 'submission',
          title: 'New Store Submission',
          message: `${sub.business_name} awaits review`,
          timestamp: sub.created_at,
          read: false,
          link: '/dashboard/submissions',
        });
      });

      // Fetch pending review reports
      const { data: reports } = await supabase
        .from('review_reports')
        .select('id, reason, created_at, status')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      reports?.forEach((report) => {
        notifications.push({
          id: `report-${report.id}`,
          type: 'report',
          title: 'Review Reported',
          message: `Report: ${report.reason}`,
          timestamp: report.created_at,
          read: false,
          link: '/dashboard/reported-reviews',
        });
      });

      // Sort all notifications by timestamp
      notifications.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return notifications.slice(0, 10);
    },
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useUnreadCount() {
  const { data: notifications = [] } = useNotifications();
  return notifications.filter((n) => !n.read).length;
}
