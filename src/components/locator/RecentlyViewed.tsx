import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, MapPin, ExternalLink, Trash2, History } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Location } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useBrowsingHistory } from '@/hooks/useBrowsingHistory';
import { AmenityIcons } from './AmenityIcons';
import { categoryLabels } from '@/data/demoData';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';

interface RecentlyViewedProps {
  onSelectLocation?: (location: Location) => void;
  className?: string;
}

export function RecentlyViewed({ onSelectLocation, className }: RecentlyViewedProps) {
  const { recentlyViewed, isLoading, isAuthenticated, refetch } = useRecentlyViewed(8);
  const { clearHistory, isClearing } = useBrowsingHistory();

  const handleClearHistory = async () => {
    try {
      await clearHistory();
      refetch();
      toast({
        title: 'History cleared',
        description: 'Your browsing history has been cleared.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to clear history. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Don't show for unauthenticated users or when no history
  if (!isAuthenticated) return null;
  if (!isLoading && recentlyViewed.length === 0) return null;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Recently Viewed</CardTitle>
          </div>
          {recentlyViewed.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground h-8">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear browsing history?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove all your recently viewed stores. Your favorites and other data will not be affected.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearHistory} disabled={isClearing}>
                    {isClearing ? 'Clearing...' : 'Clear History'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        <CardDescription>Quick access to stores you've visited</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex gap-3 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28 w-48 shrink-0 rounded-lg" />
            ))}
          </div>
        ) : (
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-3 pb-2">
              {recentlyViewed.map(({ location, viewedAt }, index) => (
                <motion.div
                  key={location.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <RecentlyViewedCard
                    location={location}
                    viewedAt={viewedAt}
                    onClick={() => onSelectLocation?.(location)}
                  />
                </motion.div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

interface RecentlyViewedCardProps {
  location: Location;
  viewedAt: string;
  onClick?: () => void;
}

function RecentlyViewedCard({ location, viewedAt, onClick }: RecentlyViewedCardProps) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof Location['openingHours'];
  const todayHours = location.openingHours[today];
  
  return (
    <div
      onClick={onClick}
      className="w-52 p-3 rounded-lg border border-border bg-card hover:border-primary/50 hover:shadow-sm cursor-pointer transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h4 className="font-medium text-sm truncate">{location.name}</h4>
            <p className="text-xs text-muted-foreground truncate">{location.city}, {location.state}</p>
          </div>
        </div>
        <Link
          to={`/location/${location.id}`}
          onClick={(e) => e.stopPropagation()}
          className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
        </Link>
      </div>
      
      <div className="flex items-center gap-2 text-xs mb-2">
        <span className="px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground truncate">
          {categoryLabels[location.category]}
        </span>
        <span className={todayHours?.isOpen ? 'text-success' : 'text-destructive'}>
          {todayHours?.isOpen ? 'Open' : 'Closed'}
        </span>
      </div>
      
      <div className="flex items-center justify-between">
        <AmenityIcons services={location.services} maxVisible={3} size="sm" />
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(new Date(viewedAt), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}
