import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface NotificationPreferences {
  id: string;
  user_id: string;
  phone_number: string;
  phone_country_code: string;
  whatsapp_enabled: boolean;
  store_alerts: boolean;
  appointment_reminders: boolean;
  submission_updates: boolean;
  marketing_messages: boolean;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as NotificationPreferences | null;
    },
  });
}

export function useSaveNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preferences: {
      phone_number: string;
      phone_country_code: string;
      whatsapp_enabled: boolean;
      store_alerts: boolean;
      appointment_reminders: boolean;
      submission_updates: boolean;
      marketing_messages: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('notification_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('notification_preferences')
          .update({
            ...preferences,
            verified: false, // Reset verification when phone changes
          })
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: user.id,
            ...preferences,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      toast({
        title: 'Preferences saved',
        description: 'Your notification preferences have been updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useSendVerificationCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!prefs) throw new Error('No notification preferences found');

      // Generate 6-digit verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store the code
      const { error: updateError } = await supabase
        .from('notification_preferences')
        .update({
          verification_code: code,
          verification_expires_at: expiresAt.toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Send the code via WhatsApp
      const fullPhone = `${prefs.phone_country_code}${prefs.phone_number}`;
      const { error: sendError } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          phone: fullPhone,
          message: `🔐 Your LocatePro verification code is: *${code}*\n\nThis code expires in 10 minutes.`,
          notificationType: 'verification',
          userId: user.id,
        },
      });

      if (sendError) throw sendError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      toast({
        title: 'Verification code sent',
        description: 'Check your WhatsApp for the verification code.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to send code',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useVerifyPhoneNumber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('verification_code, verification_expires_at')
        .eq('user_id', user.id)
        .single();

      if (!prefs) throw new Error('No notification preferences found');

      if (prefs.verification_code !== code) {
        throw new Error('Invalid verification code');
      }

      if (new Date(prefs.verification_expires_at!) < new Date()) {
        throw new Error('Verification code has expired');
      }

      // Mark as verified
      const { error } = await supabase
        .from('notification_preferences')
        .update({
          verified: true,
          verification_code: null,
          verification_expires_at: null,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      toast({
        title: 'Phone verified!',
        description: 'Your WhatsApp number has been verified successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Verification failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useSendTestMessage() {
  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!prefs) throw new Error('No notification preferences found');
      if (!prefs.verified) throw new Error('Phone number not verified');

      const fullPhone = `${prefs.phone_country_code}${prefs.phone_number}`;
      const { error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          phone: fullPhone,
          message: `✅ This is a test message from LocatePro!\n\nYour WhatsApp notifications are working correctly.`,
          notificationType: 'store_alert',
          userId: user.id,
        },
      });

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: 'Test message sent',
        description: 'Check your WhatsApp for the test message.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to send test',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
