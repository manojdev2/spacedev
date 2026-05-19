import { useState, useMemo } from 'react';
import { format, addDays, isBefore, startOfDay, parse, addMinutes } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  MessageSquare,
  CheckCircle2,
  Loader2,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  useLocationServices,
  useBookingSettings,
  useLocationAppointments,
  useCreateAppointment,
  LocationService,
} from '@/hooks/useAppointments';

interface AppointmentBookingFormProps {
  locationId: string;
  locationName: string;
  onSuccess?: () => void;
}

type BookingStep = 'service' | 'datetime' | 'details' | 'confirm';

export function AppointmentBookingForm({ 
  locationId, 
  locationName,
  onSuccess 
}: AppointmentBookingFormProps) {
  const [step, setStep] = useState<BookingStep>('service');
  const [selectedService, setSelectedService] = useState<LocationService | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');

  const { data: services = [], isLoading: servicesLoading } = useLocationServices(locationId);
  const { data: settings } = useBookingSettings(locationId);
  const { data: existingAppointments = [] } = useLocationAppointments(
    locationId,
    selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined
  );
  const createAppointment = useCreateAppointment();

  // Calculate available time slots
  const availableSlots = useMemo(() => {
    if (!selectedDate || !selectedService || !settings) return [];

    const slots: string[] = [];
    const interval = settings.slot_interval_minutes || 30;
    const buffer = settings.buffer_between_appointments || 0;
    
    // Generate slots from 9 AM to 6 PM (can be customized)
    let currentTime = parse('09:00', 'HH:mm', new Date());
    const endTime = parse('18:00', 'HH:mm', new Date());

    while (isBefore(currentTime, endTime)) {
      const timeStr = format(currentTime, 'HH:mm');
      const slotEnd = addMinutes(currentTime, selectedService.duration_minutes);

      // Check if slot conflicts with existing appointments
      const hasConflict = existingAppointments.some((apt) => {
        const aptStart = parse(apt.start_time, 'HH:mm:ss', new Date());
        const aptEnd = parse(apt.end_time, 'HH:mm:ss', new Date());
        return (
          (currentTime >= aptStart && currentTime < aptEnd) ||
          (slotEnd > aptStart && slotEnd <= aptEnd) ||
          (currentTime <= aptStart && slotEnd >= aptEnd)
        );
      });

      if (!hasConflict && isBefore(slotEnd, addMinutes(endTime, 1))) {
        slots.push(timeStr);
      }

      currentTime = addMinutes(currentTime, interval + buffer);
    }

    return slots;
  }, [selectedDate, selectedService, settings, existingAppointments]);

  // Calculate end time
  const endTime = useMemo(() => {
    if (!selectedTime || !selectedService) return null;
    const start = parse(selectedTime, 'HH:mm', new Date());
    return format(addMinutes(start, selectedService.duration_minutes), 'HH:mm');
  }, [selectedTime, selectedService]);

  // Date constraints
  const minDate = startOfDay(addDays(new Date(), 1));
  const maxDate = addDays(new Date(), settings?.advance_booking_days || 30);

  const handleSubmit = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !endTime) return;

    await createAppointment.mutateAsync({
      location_id: locationId,
      service_id: selectedService.id,
      customer_name: customerName.trim(),
      customer_email: customerEmail.trim(),
      customer_phone: customerPhone.trim() || undefined,
      appointment_date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: selectedTime,
      end_time: endTime,
      notes: notes.trim() || undefined,
    });

    onSuccess?.();
  };

  const canProceed = () => {
    switch (step) {
      case 'service':
        return !!selectedService;
      case 'datetime':
        return !!selectedDate && !!selectedTime;
      case 'details':
        return customerName.trim() && customerEmail.trim() && customerEmail.includes('@');
      default:
        return true;
    }
  };

  const nextStep = () => {
    const steps: BookingStep[] = ['service', 'datetime', 'details', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: BookingStep[] = ['service', 'datetime', 'details', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  if (servicesLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (services.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Online booking is not available for this location.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Book an Appointment</CardTitle>
        <CardDescription>Schedule your visit to {locationName}</CardDescription>
        
        {/* Progress Steps */}
        <div className="flex items-center justify-between mt-4">
          {['service', 'datetime', 'details', 'confirm'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step === s
                    ? 'bg-primary text-primary-foreground'
                    : ['service', 'datetime', 'details', 'confirm'].indexOf(step) > i
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {i + 1}
              </div>
              {i < 3 && (
                <div
                  className={`w-12 sm:w-20 h-0.5 mx-1 transition-colors ${
                    ['service', 'datetime', 'details', 'confirm'].indexOf(step) > i
                      ? 'bg-primary/40'
                      : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        <AnimatePresence mode="wait">
          {/* Step 1: Select Service */}
          {step === 'service' && (
            <motion.div
              key="service"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Label className="text-base font-medium">Select a Service</Label>
              <div className="grid gap-3">
                {services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => setSelectedService(service)}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      selectedService?.id === service.id
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{service.name}</h4>
                        {service.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {service.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        {service.duration_minutes} min
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2: Select Date & Time */}
          {step === 'datetime' && (
            <motion.div
              key="datetime"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <Label className="text-base font-medium mb-3 block">Select Date</Label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setSelectedTime(null);
                  }}
                  disabled={(date) =>
                    isBefore(date, minDate) ||
                    date > maxDate ||
                    date.getDay() === 0 // Disable Sundays
                  }
                  className="rounded-md border mx-auto"
                />
              </div>

              {selectedDate && (
                <div>
                  <Label className="text-base font-medium mb-3 block">
                    Available Times for {format(selectedDate, 'MMMM d, yyyy')}
                  </Label>
                  {availableSlots.length > 0 ? (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {availableSlots.map((time) => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                            selectedTime === time
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted hover:bg-muted/80'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No available times for this date.
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Step 3: Contact Details */}
          {step === 'details' && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Full Name *
                </Label>
                <Input
                  id="name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number (for WhatsApp reminders)
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+1234567890"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Notes (optional)
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special requests or information..."
                  rows={3}
                />
              </div>
            </motion.div>
          )}

          {/* Step 4: Confirmation */}
          {step === 'confirm' && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <h4 className="font-medium">Appointment Summary</h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service:</span>
                    <span className="font-medium">{selectedService?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span>{selectedService?.duration_minutes} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span>{selectedDate && format(selectedDate, 'MMMM d, yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time:</span>
                    <span>{selectedTime} - {endTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span>{customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span>{customerEmail}</span>
                  </div>
                  {customerPhone && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span>{customerPhone}</span>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                Your appointment will require confirmation from the store.
                You'll receive a notification once it's confirmed.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={step === 'service'}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          {step === 'confirm' ? (
            <Button
              onClick={handleSubmit}
              disabled={createAppointment.isPending}
            >
              {createAppointment.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Confirm Booking
            </Button>
          ) : (
            <Button onClick={nextStep} disabled={!canProceed()}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
