import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Star, Store, Flag, MapPin, Check, X, BellRing, Volume2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useNotificationAlerts } from '@/hooks/useNotificationAlerts';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const notificationIcons: Record<Notification['type'], typeof Star> = {
  review: Star,
  submission: Store,
  report: Flag,
  location: MapPin,
};

const notificationColors: Record<Notification['type'], string> = {
  review: 'bg-warning/10 text-warning',
  submission: 'bg-primary/10 text-primary',
  report: 'bg-destructive/10 text-destructive',
  location: 'bg-success/10 text-success',
};

export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const { data: notifications = [], isLoading } = useNotifications();
  const { permission, requestPermission, playSound } = useNotificationAlerts();

  const visibleNotifications = notifications.filter((n) => !dismissed.has(n.id));
  const unreadCount = visibleNotifications.length;

  const dismissNotification = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDismissed((prev) => new Set([...prev, id]));
  };

  const markAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    setDismissed(new Set(allIds));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium flex items-center justify-center"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        align="end"
        sideOffset={8}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    playSound('info');
                  }}
                >
                  <Volume2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Test sound</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={permission === 'granted' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={requestPermission}
                >
                  <BellRing className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {permission === 'granted' 
                  ? 'Browser notifications enabled' 
                  : 'Enable browser notifications'}
              </TooltipContent>
            </Tooltip>
            {visibleNotifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-auto py-1 px-2"
                onClick={markAllRead}
              >
                <Check className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-[320px]">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-muted shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : visibleNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Bell className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No new notifications
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              <AnimatePresence mode="popLayout">
                {visibleNotifications.map((notification) => {
                  const Icon = notificationIcons[notification.type];
                  const colorClass = notificationColors[notification.type];

                  return (
                    <motion.div
                      key={notification.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Link
                        to={notification.link || '#'}
                        onClick={() => setOpen(false)}
                        className="flex gap-3 p-4 hover:bg-muted/50 transition-colors group"
                      >
                        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0', colorClass)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                        <button
                          onClick={(e) => dismissNotification(notification.id, e)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded shrink-0"
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </Link>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>

        <div className="p-3 border-t border-border">
          <Link
            to="/dashboard/analytics"
            onClick={() => setOpen(false)}
            className="text-xs text-primary hover:underline block text-center"
          >
            View all activity
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
