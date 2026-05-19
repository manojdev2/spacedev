import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StoreSubmission {
  id: string;
  business_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  category: string;
  website: string | null;
  services: string[] | null;
  additional_notes: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  lat: number | null;
  lng: number | null;
}

export function useStoreSubmissions(status?: 'pending' | 'approved' | 'rejected') {
  return useQuery({
    queryKey: ['store-submissions', status],
    queryFn: async () => {
      let query = supabase
        .from('store_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as StoreSubmission[];
    },
  });
}

export function useSubmissionCounts() {
  return useQuery({
    queryKey: ['store-submissions', 'counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_submissions')
        .select('status');

      if (error) throw error;

      const counts = {
        pending: 0,
        approved: 0,
        rejected: 0,
        total: data?.length || 0,
      };

      data?.forEach((item) => {
        if (item.status === 'pending') counts.pending++;
        else if (item.status === 'approved') counts.approved++;
        else if (item.status === 'rejected') counts.rejected++;
      });

      return counts;
    },
  });
}

export function useUpdateSubmissionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      reviewedBy,
      submission,
    }: {
      id: string;
      status: 'approved' | 'rejected';
      reviewedBy: string;
      submission?: StoreSubmission;
    }) => {
      const { data, error } = await supabase
        .from('store_submissions')
        .update({
          status,
          reviewed_by: reviewedBy,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Send notification email for rejection (approval is handled by useApproveAndCreateLocation)
      if (status === 'rejected' && submission) {
        sendStatusNotification(
          submission.contact_email,
          submission.business_name,
          'rejected',
          submission.contact_name,
          submission.contact_phone
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-submissions'] });
    },
  });
}

// Helper function to send notification email
async function sendStatusNotification(
  email: string,
  businessName: string,
  status: 'approved' | 'rejected',
  contactName: string,
  phone?: string
) {
  // Send email notification
  try {
    const response = await supabase.functions.invoke('send-submission-notification', {
      body: { email, businessName, status, contactName },
    });
    
    if (response.error) {
      console.error('Failed to send notification email:', response.error);
    } else {
      console.log('Notification email sent successfully');
    }
  } catch (error) {
    console.error('Error sending notification email:', error);
  }

  // Send WhatsApp notification if phone number is provided
  if (phone) {
    try {
      const message = status === 'approved'
         ? `🎉 Great news, ${contactName}!\n\nYour store registration for *${businessName}* has been approved!\n\nYour store is now live on LocatePro and customers can find you through our store locator.\n\nThank you for joining our network!`
         : `📋 Update on your submission\n\nDear ${contactName},\n\nThank you for your interest in registering *${businessName}* on LocatePro.\n\nAfter review, your submission could not be approved at this time. You're welcome to submit a new application with updated details.\n\nIf you have questions, please contact our support team.`;

      await supabase.functions.invoke('send-whatsapp', {
        body: {
          phone,
          message,
          notificationType: 'submission_update',
          metadata: { businessName, status },
        },
      });
      console.log('WhatsApp notification sent successfully');
    } catch (error) {
      console.error('Error sending WhatsApp notification:', error);
    }
  }
}

export function useApproveAndCreateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      submission,
      reviewedBy,
      organizationId,
    }: {
      submission: StoreSubmission;
      reviewedBy: string;
      organizationId: string;
    }) => {
      // Validate required coordinates
      if (submission.lat === null || submission.lng === null) {
        throw new Error('Location coordinates are required. Please set the map pin before approving.');
      }

      // Map category to enum value (fallback to 'retail' if not matching)
      const validCategories = ['retail', 'warehouse', 'service-center', 'headquarters', 'branch'];
      const category = validCategories.includes(submission.category) 
        ? submission.category as 'retail' | 'warehouse' | 'service-center' | 'headquarters' | 'branch'
        : 'retail';

      // Create the location
      const { data: location, error: locationError } = await supabase
        .from('locations')
        .insert({
          name: submission.business_name,
          email: submission.contact_email,
          phone: submission.contact_phone,
          address: submission.address,
          city: submission.city,
          state: submission.state,
          zip_code: submission.zip_code,
          country: submission.country,
          website: submission.website,
          category,
          services: submission.services || [],
          lat: submission.lat,
          lng: submission.lng,
          organization_id: organizationId,
          is_active: true,
        })
        .select()
        .single();

      if (locationError) throw locationError;

      // Update submission status
      const { error: updateError } = await supabase
        .from('store_submissions')
        .update({
          status: 'approved',
          reviewed_by: reviewedBy,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', submission.id);

      if (updateError) throw updateError;

      // Send notification email (non-blocking)
      sendStatusNotification(
        submission.contact_email,
        submission.business_name,
        'approved',
        submission.contact_name,
        submission.contact_phone
      );

      return location;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
}

export function useUpdateSubmissionCoordinates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      lat,
      lng,
    }: {
      id: string;
      lat: number;
      lng: number;
    }) => {
      const { data, error } = await supabase
        .from('store_submissions')
        .update({ lat, lng })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-submissions'] });
    },
  });
}

export function useDeleteSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('store_submissions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-submissions'] });
    },
  });
}
