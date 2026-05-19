import { Wifi, Car, Bath, Truck, Fuel, Coffee, Dog, Package, Accessibility, Sun, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { AVAILABLE_AMENITIES, AmenityId } from '@/hooks/useAmenityPreferences';
import { cn } from '@/lib/utils';

// Map amenity IDs to icons
const amenityIcons: Record<string, React.ReactNode> = {
  'wifi': <Wifi className="h-4 w-4" />,
  'parking': <Car className="h-4 w-4" />,
  'restrooms': <Bath className="h-4 w-4" />,
  'drive-through': <Truck className="h-4 w-4" />,
  'ev-charging': <Fuel className="h-4 w-4" />,
  'cafe': <Coffee className="h-4 w-4" />,
  'pet-friendly': <Dog className="h-4 w-4" />,
  'curbside-pickup': <Package className="h-4 w-4" />,
  'wheelchair-accessible': <Accessibility className="h-4 w-4" />,
  'outdoor-seating': <Sun className="h-4 w-4" />,
  'delivery': <Truck className="h-4 w-4" />,
  'atm': <MapPin className="h-4 w-4" />,
};

interface AmenityPreferencesCardProps {
  preferredAmenities: AmenityId[];
  onToggle: (amenityId: AmenityId) => void;
  isLoading?: boolean;
}

export function AmenityPreferencesCard({
  preferredAmenities,
  onToggle,
  isLoading,
}: AmenityPreferencesCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Preferred Amenities
        </CardTitle>
        <CardDescription>
          Select amenities you frequently look for. These will be automatically included in your searches.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {AVAILABLE_AMENITIES.map((amenity) => {
            const isSelected = preferredAmenities.includes(amenity.id);
            return (
              <label
                key={amenity.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                  "hover:border-primary/50 hover:bg-muted/50",
                  isSelected && "border-primary bg-primary/5"
                )}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggle(amenity.id)}
                  className="shrink-0"
                />
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn(
                    "shrink-0",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )}>
                    {amenityIcons[amenity.id]}
                  </span>
                  <span className="text-sm font-medium truncate">{amenity.label}</span>
                </div>
              </label>
            );
          })}
        </div>
        
        {preferredAmenities.length > 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            {preferredAmenities.length} amenit{preferredAmenities.length === 1 ? 'y' : 'ies'} selected — 
            these will be pre-selected when you search for stores.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
