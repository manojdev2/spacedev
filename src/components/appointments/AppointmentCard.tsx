import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MoreHorizontal,
  Download,
  MessageSquare,
  ExternalLink,
  CalendarCheck,
  UserX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Appointment, downloadICalFile } from '@/hooks/useAppointments';
import { cn } from '@/lib/utils';

interface AppointmentCardProps {
  appointment: Appointment;
  onConfirm?: () => void;
  onCancel?: () => void;
  onComplete?: () => void;
  onNoShow?: () => void;
  onViewDetails?: () => void;
}

const statusConfig: Record<
  Appointment['status'],
  { label: string; bgColor: string; textColor: string; borderColor: string; icon: typeof CheckCircle2 }
> = {
  pending: {
    label: 'Pending',
    bgColor: 'bg-warning/10',
    textColor: 'text-warning',
    borderColor: 'border-warning/30',
    icon: AlertCircle,
  },
  confirmed: {
    label: 'Confirmed',
    bgColor: 'bg-success/10',
    textColor: 'text-success',
    borderColor: 'border-success/30',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelled',
    bgColor: 'bg-destructive/10',
    textColor: 'text-destructive',
    borderColor: 'border-destructive/30',
    icon: XCircle,
  },
  completed: {
    label: 'Completed',
    bgColor: 'bg-primary/10',
    textColor: 'text-primary',
    borderColor: 'border-primary/30',
    icon: CalendarCheck,
  },
  no_show: {
    label: 'No Show',
    bgColor: 'bg-muted',
    textColor: 'text-muted-foreground',
    borderColor: 'border-border',
    icon: UserX,
  },
};

function formatAppointmentDate(dateStr: string) {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE, MMM d');
}

function formatTime(time: string) {
  return time.slice(0, 5);
}

export function AppointmentCard({
  appointment,
  onConfirm,
  onCancel,
  onComplete,
  onNoShow,
  onViewDetails,
}: AppointmentCardProps) {
  const status = statusConfig[appointment.status];
  const StatusIcon = status.icon;
  const isPastAppointment = isPast(
    parseISO(`${appointment.appointment_date}T${appointment.end_time}`)
  );

  const isPending = appointment.status === 'pending';
  const isConfirmed = appointment.status === 'confirmed';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <Card
        className={cn(
          'overflow-hidden transition-all hover:shadow-md',
          isPending && 'ring-2 ring-warning/50'
        )}
      >
        {/* Status Header Bar */}
        <div
          className={cn(
            'px-4 py-2 flex items-center justify-between border-b',
            status.bgColor,
            status.borderColor
          )}
        >
          <div className="flex items-center gap-2">
            <StatusIcon className={cn('h-4 w-4', status.textColor)} />
            <span className={cn('text-sm font-semibold', status.textColor)}>
              {status.label}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">
                {formatAppointmentDate(appointment.appointment_date)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">
                {formatTime(appointment.start_time)} – {formatTime(appointment.end_time)}
              </span>
            </div>
          </div>
        </div>

        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Main Content */}
            <div className="flex-1 grid sm:grid-cols-2 gap-4">
              {/* Customer Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Customer
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-semibold text-foreground">
                      {appointment.customer_name}
                    </span>
                  </div>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a
                          href={`mailto:${appointment.customer_email}`}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                        >
                          <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate group-hover:underline">
                            {appointment.customer_email}
                          </span>
                        </a>
                      </TooltipTrigger>
                      <TooltipContent>Send email</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {appointment.customer_phone && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={`tel:${appointment.customer_phone}`}
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                          >
                            <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="group-hover:underline">
                              {appointment.customer_phone}
                            </span>
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>Call customer</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>

              {/* Appointment Details Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Details
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-4 w-4 text-accent" />
                    </div>
                    <span className="font-semibold text-foreground truncate">
                      {appointment.location?.name || 'Unknown Location'}
                    </span>
                  </div>

                  {appointment.service && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>
                        {appointment.service.name}
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {appointment.service.duration_minutes} min
                        </Badge>
                      </span>
                    </div>
                  )}

                  {appointment.notes && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MessageSquare className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-2 italic">"{appointment.notes}"</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions Section */}
            <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-start gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 lg:border-l lg:pl-4 border-border">
              {/* Primary Actions */}
              {isPending && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={onConfirm}
                    className="bg-success hover:bg-success/90 text-success-foreground shadow-sm"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    <span className="hidden sm:inline">Confirm</span>
                    <span className="sm:hidden">Accept</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onCancel}
                    className="border-destructive/30 text-destructive hover:bg-destructive/10"
                  >
                    <XCircle className="h-4 w-4 mr-1.5" />
                    Decline
                  </Button>
                </div>
              )}

              {isConfirmed && !isPastAppointment && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCancel}
                  className="border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="h-4 w-4 mr-1.5" />
                  Cancel
                </Button>
              )}

              {isConfirmed && isPastAppointment && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={onComplete}>
                    <CalendarCheck className="h-4 w-4 mr-1.5" />
                    Complete
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onNoShow}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <UserX className="h-4 w-4 mr-1.5" />
                    No Show
                  </Button>
                </div>
              )}

              {/* Secondary Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">More options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={onViewDetails}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => downloadICalFile(appointment)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download iCal
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {appointment.customer_phone && (
                    <DropdownMenuItem asChild>
                      <a
                        href={`https://wa.me/${appointment.customer_phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        WhatsApp Customer
                      </a>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <a
                      href={`mailto:${appointment.customer_email}`}
                      className="flex items-center"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Email Customer
                    </a>
                  </DropdownMenuItem>
                  {appointment.customer_phone && (
                    <DropdownMenuItem asChild>
                      <a
                        href={`tel:${appointment.customer_phone}`}
                        className="flex items-center"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Call Customer
                      </a>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
