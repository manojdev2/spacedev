import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface LocationService {
  id: string;
  location_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  location_id: string;
  service_id: string | null;
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  notes: string | null;
  admin_notes: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  service?: LocationService;
  location?: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    phone: string;
  };
}

export interface BookingSettings {
  id: string;
  location_id: string;
  booking_enabled: boolean;
  advance_booking_days: number;
  min_notice_hours: number;
  slot_interval_minutes: number;
  max_appointments_per_slot: number;
  buffer_between_appointments: number;
}

// Fetch services for a location
export function useLocationServices(locationId: string | undefined) {
  return useQuery({
    queryKey: ['location-services', locationId],
    queryFn: async () => {
      if (!locationId) return [];
      const { data, error } = await supabase
        .from('location_services')
        .select('*')
        .eq('location_id', locationId)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data as LocationService[];
    },
    enabled: !!locationId,
  });
}

// Fetch booking settings for a location
export function useBookingSettings(locationId: string | undefined) {
  return useQuery({
    queryKey: ['booking-settings', locationId],
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

// Fetch existing appointments for a date
export function useLocationAppointments(locationId: string | undefined, date: string | undefined) {
  return useQuery({
    queryKey: ['location-appointments', locationId, date],
    queryFn: async () => {
      if (!locationId || !date) return [];
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('location_id', locationId)
        .eq('appointment_date', date)
        .neq('status', 'cancelled');

      if (error) throw error;
      return data as Appointment[];
    },
    enabled: !!locationId && !!date,
  });
}

// Fetch user's appointments
export function useMyAppointments() {
  return useQuery({
    queryKey: ['my-appointments'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          location:locations(id, name, address, city, state, phone),
          service:location_services(*)
        `)
        .eq('user_id', user.id)
        .order('appointment_date', { ascending: true });

      if (error) throw error;
      return data as Appointment[];
    },
  });
}

// Fetch all appointments for org locations (admin view)
export function useOrgAppointments(status?: Appointment['status']) {
  return useQuery({
    queryKey: ['org-appointments', status],
    queryFn: async () => {
      let query = supabase
        .from('appointments')
        .select(`
          *,
          location:locations(id, name, address, city, state, phone),
          service:location_services(*)
        `)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Appointment[];
    },
  });
}

// Create a new appointment
export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appointment: {
      location_id: string;
      service_id: string;
      customer_name: string;
      customer_email: string;
      customer_phone?: string;
      appointment_date: string;
      start_time: string;
      end_time: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('appointments')
        .insert({
          ...appointment,
          user_id: user?.id || null,
          status: 'pending',
        })
        .select(`
          *,
          location:locations(id, name, address, city, state, phone),
          service:location_services(*)
        `)
        .single();

      if (error) throw error;

      // Send email confirmation to customer (fire-and-forget, don't block on errors)
      const createdAppointment = data as Appointment;
      supabase.functions.invoke('send-appointment-notification', {
        body: {
          customerEmail: appointment.customer_email,
          customerName: appointment.customer_name,
          status: 'pending',
          appointmentDate: appointment.appointment_date,
          startTime: appointment.start_time,
          endTime: appointment.end_time,
          locationName: createdAppointment.location?.name || 'Store',
          locationAddress: createdAppointment.location 
            ? `${createdAppointment.location.address}, ${createdAppointment.location.city}, ${createdAppointment.location.state}` 
            : '',
          serviceName: createdAppointment.service?.name,
        },
      }).catch(e => console.warn('Email notification failed (non-blocking):', e));

      // Send WhatsApp notification to customer if phone provided (fire-and-forget)
      if (appointment.customer_phone) {
        supabase.functions.invoke('send-whatsapp', {
          body: {
            phone: appointment.customer_phone,
            message: `📅 *Appointment Request Received*\n\nThank you, ${appointment.customer_name}!\n\nYour appointment at *${createdAppointment.location?.name}* on ${new Date(appointment.appointment_date).toLocaleDateString()} at ${appointment.start_time} has been submitted.\n\nStatus: ⏳ *Pending Confirmation*\n\nWe'll notify you once it's confirmed.`,
            notificationType: 'appointment_reminder',
            metadata: { appointmentId: data.id },
          },
        }).catch(e => console.warn('WhatsApp notification failed (non-blocking):', e));
      }

      return createdAppointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['location-appointments'] });
      toast({
        title: 'Appointment requested',
        description: 'Your appointment has been submitted and is pending confirmation.',
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

// Update appointment status (admin)
export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      adminNotes,
      cancellationReason,
    }: {
      id: string;
      status: Appointment['status'];
      adminNotes?: string;
      cancellationReason?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const updates: Record<string, unknown> = { status };
      
      if (status === 'confirmed') {
        updates.confirmed_by = user?.id;
        updates.confirmed_at = new Date().toISOString();
      } else if (status === 'cancelled') {
        updates.cancelled_at = new Date().toISOString();
        if (cancellationReason) updates.cancellation_reason = cancellationReason;
      }
      
      if (adminNotes) updates.admin_notes = adminNotes;

      const { data, error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          location:locations(id, name, address, city, state, phone),
          service:location_services(*)
        `)
        .single();

      if (error) throw error;

      // Send notifications to customer (fire-and-forget, don't block on errors)
      const appointment = data as Appointment;
      
      // Send email notification
      if (appointment.customer_email && (status === 'confirmed' || status === 'cancelled')) {
        supabase.functions.invoke('send-appointment-notification', {
          body: {
            customerEmail: appointment.customer_email,
            customerName: appointment.customer_name,
            status,
            appointmentDate: appointment.appointment_date,
            startTime: appointment.start_time,
            endTime: appointment.end_time,
            locationName: appointment.location?.name || 'Store',
            locationAddress: appointment.location 
              ? `${appointment.location.address}, ${appointment.location.city}, ${appointment.location.state}` 
              : '',
            serviceName: appointment.service?.name,
            cancellationReason,
          },
        }).catch(e => console.warn('Email notification failed (non-blocking):', e));
      }

      // Send WhatsApp notification (fire-and-forget)
      if (appointment.customer_phone) {
        const message = status === 'confirmed'
          ? `✅ *Appointment Confirmed*\n\nGreat news, ${appointment.customer_name}!\n\nYour appointment at *${appointment.location?.name}* has been confirmed.\n\n📅 Date: ${new Date(appointment.appointment_date).toLocaleDateString()}\n⏰ Time: ${appointment.start_time}\n📍 ${appointment.location?.address}, ${appointment.location?.city}\n\nSee you there!`
          : status === 'cancelled'
          ? `❌ *Appointment Cancelled*\n\nHi ${appointment.customer_name},\n\nUnfortunately, your appointment at *${appointment.location?.name}* on ${new Date(appointment.appointment_date).toLocaleDateString()} has been cancelled.\n\n${cancellationReason ? `Reason: ${cancellationReason}\n\n` : ''}Please feel free to book another time.`
          : null;

        if (message) {
          supabase.functions.invoke('send-whatsapp', {
            body: {
              phone: appointment.customer_phone,
              message,
              notificationType: 'appointment_reminder',
              metadata: { appointmentId: id, status },
            },
          }).catch(e => console.warn('WhatsApp notification failed (non-blocking):', e));
        }
      }

      return appointment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['org-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['location-appointments'] });
      toast({
        title: `Appointment ${variables.status}`,
        description: `The appointment has been ${variables.status}.`,
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

// Cancel own appointment
export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['org-appointments'] });
      toast({
        title: 'Appointment cancelled',
        description: 'Your appointment has been cancelled.',
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

// Generate iCal file
export function generateICalFile(appointment: Appointment): string {
  const startDate = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
  const endDate = new Date(`${appointment.appointment_date}T${appointment.end_time}`);

  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const location = appointment.location
    ? `${appointment.location.address}, ${appointment.location.city}, ${appointment.location.state}`
    : '';

  const ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//LocatePro//Appointment//EN
BEGIN:VEVENT
UID:${appointment.id}@locatepro.app
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${appointment.service?.name || 'Appointment'} at ${appointment.location?.name || 'Store'}
DESCRIPTION:${appointment.notes || ''}
LOCATION:${location}
STATUS:${appointment.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE'}
END:VEVENT
END:VCALENDAR`;

  return ical;
}

export function downloadICalFile(appointment: Appointment) {
  const ical = generateICalFile(appointment);
  const blob = new Blob([ical], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `appointment-${appointment.id}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
