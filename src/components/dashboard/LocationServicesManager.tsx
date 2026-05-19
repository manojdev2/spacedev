import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, GripVertical, Clock, Loader2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from '@/hooks/use-toast';
import { LocationService, BookingSettings } from '@/hooks/useAppointments';

interface LocationServicesManagerProps {
  locationId: string;
  locationName: string;
}

export function LocationServicesManager({ locationId, locationName }: LocationServicesManagerProps) {
  const queryClient = useQueryClient();
  const [editingService, setEditingService] = useState<LocationService | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration_minutes: 30,
    is_active: true,
  });

  // Fetch services
  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['location-services-admin', locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location_services')
        .select('*')
        .eq('location_id', locationId)
        .order('display_order');
      if (error) throw error;
      return data as LocationService[];
    },
  });

  // Fetch booking settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['booking-settings-admin', locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location_booking_settings')
        .select('*')
        .eq('location_id', locationId)
        .maybeSingle();
      if (error) throw error;
      return data as BookingSettings | null;
    },
  });

  // Create/update service
  const saveService = useMutation({
    mutationFn: async (service: typeof formData & { id?: string }) => {
      if (service.id) {
        const { error } = await supabase
          .from('location_services')
          .update({
            name: service.name,
            description: service.description,
            duration_minutes: service.duration_minutes,
            is_active: service.is_active,
          })
          .eq('id', service.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('location_services')
          .insert({
            location_id: locationId,
            name: service.name,
            description: service.description,
            duration_minutes: service.duration_minutes,
            is_active: service.is_active,
            display_order: services.length,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-services-admin', locationId] });
      queryClient.invalidateQueries({ queryKey: ['location-services', locationId] });
      setIsDialogOpen(false);
      setEditingService(null);
      resetForm();
      toast({ title: 'Service saved successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete service
  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('location_services').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-services-admin', locationId] });
      queryClient.invalidateQueries({ queryKey: ['location-services', locationId] });
      toast({ title: 'Service deleted' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Save booking settings
  const saveSettings = useMutation({
    mutationFn: async (newSettings: Partial<BookingSettings>) => {
      if (settings?.id) {
        const { error } = await supabase
          .from('location_booking_settings')
          .update(newSettings)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('location_booking_settings')
          .insert({ location_id: locationId, ...newSettings });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-settings-admin', locationId] });
      queryClient.invalidateQueries({ queryKey: ['booking-settings', locationId] });
      toast({ title: 'Booking settings saved' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({ name: '', description: '', duration_minutes: 30, is_active: true });
  };

  const handleEdit = (service: LocationService) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      duration_minutes: service.duration_minutes,
      is_active: service.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingService(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    saveService.mutate({
      ...formData,
      id: editingService?.id,
    });
  };

  if (servicesLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Booking Settings */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="settings">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Booking Settings
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Online Booking</Label>
                  <p className="text-xs text-muted-foreground">Allow customers to book appointments online</p>
                </div>
                <Switch
                  checked={settings?.booking_enabled ?? true}
                  onCheckedChange={(checked) => saveSettings.mutate({ booking_enabled: checked })}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Advance Booking (days)</Label>
                  <Input
                    type="number"
                    value={settings?.advance_booking_days ?? 30}
                    onChange={(e) => saveSettings.mutate({ advance_booking_days: Number(e.target.value) })}
                    min={1}
                    max={365}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Minimum Notice (hours)</Label>
                  <Input
                    type="number"
                    value={settings?.min_notice_hours ?? 24}
                    onChange={(e) => saveSettings.mutate({ min_notice_hours: Number(e.target.value) })}
                    min={0}
                    max={168}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slot Interval (minutes)</Label>
                  <Input
                    type="number"
                    value={settings?.slot_interval_minutes ?? 30}
                    onChange={(e) => saveSettings.mutate({ slot_interval_minutes: Number(e.target.value) })}
                    min={15}
                    max={120}
                    step={15}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Buffer Between Appointments (min)</Label>
                  <Input
                    type="number"
                    value={settings?.buffer_between_appointments ?? 0}
                    onChange={(e) => saveSettings.mutate({ buffer_between_appointments: Number(e.target.value) })}
                    min={0}
                    max={60}
                    step={5}
                  />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Services List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium">Available Services</h4>
          <Button size="sm" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            Add Service
          </Button>
        </div>

        {services.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Clock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">
                No services configured. Add services to enable appointment booking.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {services.map((service) => (
              <Card key={service.id} className={!service.is_active ? 'opacity-60' : ''}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{service.name}</span>
                          {!service.is_active && (
                            <Badge variant="secondary" className="text-xs">Inactive</Badge>
                          )}
                        </div>
                        {service.description && (
                          <p className="text-xs text-muted-foreground">{service.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        {service.duration_minutes} min
                      </Badge>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(service)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteService.mutate(service.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Service Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingService ? 'Edit Service' : 'Add Service'}</DialogTitle>
            <DialogDescription>
              Configure the service details for {locationName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Service Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., General Consultation"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the service..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                min={15}
                max={480}
                step={15}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.name.trim() || saveService.isPending}>
              {saveService.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
