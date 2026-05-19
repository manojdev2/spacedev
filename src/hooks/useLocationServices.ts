import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { LocationService, BookingSettings } from './useAppointments';

// Fetch all services for org locations (admin)
export function useOrgLocationServices(locationId?: string) {
  return useQuery({
    queryKey: ['org-location-services', locationId],
    queryFn: async () => {
      let query = supabase
        .from('location_services')
        .select('*')
        .order('display_order');

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as LocationService[];
    },
  });
}

// Create a new service
export function useCreateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (service: {
      location_id: string;
      name: string;
      description?: string;
      duration_minutes: number;
    }) => {
      const { data, error } = await supabase
        .from('location_services')
        .insert(service)
        .select()
        .single();

      if (error) throw error;
      return data as LocationService;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-location-services'] });
      queryClient.invalidateQueries({ queryKey: ['location-services'] });
      toast({
        title: 'Service created',
        description: 'The service has been added successfully.',
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

// Update a service
export function useUpdateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<LocationService> & { id: string }) => {
      const { data, error } = await supabase
        .from('location_services')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as LocationService;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-location-services'] });
      queryClient.invalidateQueries({ queryKey: ['location-services'] });
      toast({
        title: 'Service updated',
        description: 'The service has been updated successfully.',
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

// Delete a service
export function useDeleteService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('location_services')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-location-services'] });
      queryClient.invalidateQueries({ queryKey: ['location-services'] });
      toast({
        title: 'Service deleted',
        description: 'The service has been removed.',
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

// Fetch booking settings for org location
export function useOrgBookingSettings(locationId: string | undefined) {
  return useQuery({
    queryKey: ['org-booking-settings', locationId],
    queryFn: async () => {
      if (!locationId) return null;
      const { data, error } = await supabase
        .from('location_booking_settings')
        .select('*')
        .eq('location_id', locationId)
        .maybeSingle();

      if (error) throw error;
      return data as BookingSettings | null;
    },
    enabled: !!locationId,
  });
}

// Create or update booking settings
export function useSaveBookingSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Omit<BookingSettings, 'id'> & { id?: string }) => {
      if (settings.id) {
        const { data, error } = await supabase
          .from('location_booking_settings')
          .update(settings)
          .eq('id', settings.id)
          .select()
          .single();

        if (error) throw error;
        return data as BookingSettings;
      } else {
        const { data, error } = await supabase
          .from('location_booking_settings')
          .insert(settings)
          .select()
          .single();

        if (error) throw error;
        return data as BookingSettings;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-booking-settings'] });
      queryClient.invalidateQueries({ queryKey: ['booking-settings'] });
      toast({
        title: 'Settings saved',
        description: 'Booking settings have been updated.',
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
