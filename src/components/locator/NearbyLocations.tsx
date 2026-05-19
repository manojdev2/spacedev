import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Navigation, ChevronRight, Store } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePublicLocations } from '@/hooks/useLocations';
import { calculateDistance, formatDistance } from '@/lib/distance';
import { categoryLabels } from '@/data/demoData';
import { Location } from '@/types';

interface NearbyLocationsProps {
  currentLocation: Location;
  maxDistance?: number; // miles
  limit?: number;
}

export function NearbyLocations({ 
  currentLocation, 
  maxDistance = 50, 
  limit = 4 
}: NearbyLocationsProps) {
  const { data: allLocations = [], isLoading } = usePublicLocations();

  // Calculate distances and filter nearby locations
  const nearbyLocations = allLocations
    .filter((loc) => loc.id !== currentLocation.id)
    .map((loc) => ({
      ...loc,
      distance: calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        loc.lat,
        loc.lng
      ),
    }))
    .filter((loc) => loc.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Nearby Locations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (nearbyLocations.length === 0) {
    return null; // Don't show section if no nearby locations
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="h-5 w-5" />
          Nearby Locations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {nearbyLocations.map((location, index) => (
          <motion.div
            key={location.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link
              to={`/location/${location.id}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate group-hover:text-primary transition-colors">
                  {location.name}
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="truncate">{location.city}, {location.state}</span>
                  <span>•</span>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {categoryLabels[location.category]}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm font-medium text-primary">
                    <Navigation className="h-3 w-3" />
                    {formatDistance(location.distance)}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </Link>
          </motion.div>
        ))}

        {allLocations.length > limit + 1 && (
          <Button variant="ghost" className="w-full" asChild>
            <Link to="/locator">
              View All Locations
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
