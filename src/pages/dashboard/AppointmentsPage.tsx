import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Calendar, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useOrgAppointments,
  useUpdateAppointmentStatus,
  Appointment,
} from '@/hooks/useAppointments';
import { AppointmentCard } from '@/components/appointments/AppointmentCard';

export default function AppointmentsPage() {
  const [activeTab, setActiveTab] = useState<string>('pending');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    type: 'confirm' | 'cancel' | 'complete' | 'no_show';
    appointment: Appointment;
  } | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  const { data: appointments = [], isLoading } = useOrgAppointments(
    activeTab === 'all' ? undefined : (activeTab as Appointment['status'])
  );
  const updateStatus = useUpdateAppointmentStatus();

  const handleStatusUpdate = async (status: Appointment['status']) => {
    if (!actionDialog) return;

    await updateStatus.mutateAsync({
      id: actionDialog.appointment.id,
      status,
      cancellationReason: status === 'cancelled' ? cancellationReason : undefined,
    });

    setActionDialog(null);
    setCancellationReason('');
  };

  const pendingCount = appointments.filter((a) => a.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Appointments</h1>
          <p className="text-muted-foreground">
            Manage and approve customer appointment requests
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge
            variant="destructive"
            className="text-sm px-4 py-2 self-start sm:self-auto animate-pulse"
          >
            {pendingCount} pending
          </Badge>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 gap-1 bg-muted/50 p-1">
            <TabsTrigger 
              value="pending" 
              className="relative gap-1.5 data-[state=active]:bg-warning/20 data-[state=active]:text-warning data-[state=active]:shadow-sm"
            >
              Pending
              {pendingCount > 0 && (
                <span className="h-5 min-w-[20px] px-1 rounded-full bg-warning text-warning-foreground text-xs flex items-center justify-center font-semibold">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="confirmed"
              className="data-[state=active]:bg-success/20 data-[state=active]:text-success data-[state=active]:shadow-sm"
            >
              Confirmed
            </TabsTrigger>
            <TabsTrigger 
              value="completed"
              className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              Completed
            </TabsTrigger>
            <TabsTrigger 
              value="cancelled"
              className="data-[state=active]:bg-destructive/20 data-[state=active]:text-destructive data-[state=active]:shadow-sm"
            >
              Cancelled
            </TabsTrigger>
            <TabsTrigger 
              value="all" 
              className="hidden sm:flex data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              All
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : appointments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="h-16 w-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-1">No appointments found</h3>
                <p className="text-muted-foreground text-sm">
                  {activeTab !== 'all'
                    ? `There are no ${activeTab} appointments at the moment.`
                    : 'No appointments have been booked yet.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              <AnimatePresence mode="popLayout">
                {appointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onConfirm={() =>
                      setActionDialog({ type: 'confirm', appointment })
                    }
                    onCancel={() =>
                      setActionDialog({ type: 'cancel', appointment })
                    }
                    onComplete={() =>
                      setActionDialog({ type: 'complete', appointment })
                    }
                    onNoShow={() =>
                      setActionDialog({ type: 'no_show', appointment })
                    }
                    onViewDetails={() => setSelectedAppointment(appointment)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Action Confirmation Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.type === 'confirm' && 'Confirm Appointment'}
              {actionDialog?.type === 'cancel' && 'Cancel Appointment'}
              {actionDialog?.type === 'complete' && 'Mark as Completed'}
              {actionDialog?.type === 'no_show' && 'Mark as No Show'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog?.type === 'confirm' &&
                'The customer will be notified that their appointment has been confirmed.'}
              {actionDialog?.type === 'cancel' &&
                'The customer will be notified that their appointment has been cancelled.'}
              {actionDialog?.type === 'complete' &&
                'Mark this appointment as successfully completed.'}
              {actionDialog?.type === 'no_show' &&
                'Mark this appointment as a no-show (customer did not arrive).'}
            </DialogDescription>
          </DialogHeader>

          {actionDialog?.type === 'cancel' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Cancellation Reason (optional)
              </label>
              <Textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Provide a reason for cancellation..."
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={
                actionDialog?.type === 'cancel' || actionDialog?.type === 'no_show'
                  ? 'destructive'
                  : 'default'
              }
              onClick={() => {
                const statusMap = {
                  confirm: 'confirmed',
                  cancel: 'cancelled',
                  complete: 'completed',
                  no_show: 'no_show',
                } as const;
                handleStatusUpdate(statusMap[actionDialog!.type]);
              }}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Confirm'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog - placeholder for future enhancement */}
      <Dialog
        open={!!selectedAppointment}
        onOpenChange={() => setSelectedAppointment(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Customer</span>
                  <p className="font-medium">{selectedAppointment.customer_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email</span>
                  <p className="font-medium">{selectedAppointment.customer_email}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Phone</span>
                  <p className="font-medium">
                    {selectedAppointment.customer_phone || 'Not provided'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Location</span>
                  <p className="font-medium">
                    {selectedAppointment.location?.name || 'Unknown'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date</span>
                  <p className="font-medium">{selectedAppointment.appointment_date}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Time</span>
                  <p className="font-medium">
                    {selectedAppointment.start_time.slice(0, 5)} -{' '}
                    {selectedAppointment.end_time.slice(0, 5)}
                  </p>
                </div>
              </div>
              {selectedAppointment.notes && (
                <div>
                  <span className="text-muted-foreground text-sm">Notes</span>
                  <p className="mt-1 text-sm bg-muted p-3 rounded-lg">
                    {selectedAppointment.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
