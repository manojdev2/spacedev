import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNotificationAlerts } from '@/hooks/useNotificationAlerts';
import { useSoundPreference } from '@/hooks/useSoundPreference';

/**
 * Hook to subscribe to real-time notification updates.
 * Listens to reviews, store_submissions, and review_reports tables.
 * Shows toast notifications and plays sound alerts when new items arrive.
 */
export function useNotificationsRealtime() {
  const queryClient = useQueryClient();
  const { soundEnabled } = useSoundPreference();
  const { triggerCriticalAlert, triggerWarningAlert, triggerInfoAlert } = useNotificationAlerts({ soundEnabled });
  
  // Use refs to avoid recreating the subscription when alert functions change
  const alertsRef = useRef({ triggerCriticalAlert, triggerWarningAlert, triggerInfoAlert });
  alertsRef.current = { triggerCriticalAlert, triggerWarningAlert, triggerInfoAlert };

  useEffect(() => {
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reviews',
        },
        (payload) => {
          console.log('New review received:', payload);
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          
          const rating = (payload.new as { rating?: number })?.rating;
          const title = '⭐ New Review';
          const message = rating 
            ? `A new ${rating}-star review has been submitted`
            : 'A new review has been submitted';
          
          toast({ title, description: message });
          alertsRef.current.triggerInfoAlert(title, message);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'store_submissions',
        },
        (payload) => {
          console.log('New store submission received:', payload);
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          
          const businessName = (payload.new as { business_name?: string })?.business_name;
          const title = '🏪 New Store Submission';
          const message = businessName 
            ? `${businessName} has submitted a registration`
            : 'A new store registration has been submitted';
          
          toast({ title, description: message });
          alertsRef.current.triggerWarningAlert(title, message);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'review_reports',
        },
        (payload) => {
          console.log('New review report received:', payload);
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          
          const reason = (payload.new as { reason?: string })?.reason;
          const title = '🚩 Review Reported';
          const message = reason 
            ? `A review has been reported: ${reason}`
            : 'A review has been reported for moderation';
          
          toast({ title, description: message, variant: 'destructive' });
          // Critical alert with sound and browser notification
          alertsRef.current.triggerCriticalAlert(title, message);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
        },
        (payload) => {
          console.log('New appointment received:', payload);
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['appointments'] });
          
          const customerName = (payload.new as { customer_name?: string })?.customer_name;
          const appointmentDate = (payload.new as { appointment_date?: string })?.appointment_date;
          const title = '📅 New Appointment Booked';
          const message = customerName 
            ? `${customerName} has requested an appointment${appointmentDate ? ` for ${new Date(appointmentDate).toLocaleDateString()}` : ''}`
            : 'A new appointment has been requested';
          
          toast({ title, description: message });
          alertsRef.current.triggerWarningAlert(title, message);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'store_submissions',
        },
        () => {
          // Refresh when submissions are reviewed/updated
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'review_reports',
        },
        () => {
          // Refresh when reports are reviewed/resolved
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
