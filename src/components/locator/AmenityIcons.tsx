import { Wifi, Car, Bath, Truck, Fuel, Coffee, Dog, Package, Accessibility, Sun, MapPin, CreditCard, Gift, Undo2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Map service IDs to icons and labels
const amenityConfig: Record<string, { icon: React.ElementType; label: string }> = {
  'wifi': { icon: Wifi, label: 'WiFi' },
  'free-wifi': { icon: Wifi, label: 'Free WiFi' },
  'parking': { icon: Car, label: 'Parking' },
  'free-parking': { icon: Car, label: 'Free Parking' },
  'restrooms': { icon: Bath, label: 'Restrooms' },
  'drive-through': { icon: Truck, label: 'Drive-through' },
  'drive-thru': { icon: Truck, label: 'Drive-through' },
  'ev-charging': { icon: Fuel, label: 'EV Charging' },
  'cafe': { icon: Coffee, label: 'Café' },
  'coffee': { icon: Coffee, label: 'Coffee' },
  'pet-friendly': { icon: Dog, label: 'Pet Friendly' },
  'curbside-pickup': { icon: Package, label: 'Curbside Pickup' },
  'wheelchair-accessible': { icon: Accessibility, label: 'Wheelchair Accessible' },
  'outdoor-seating': { icon: Sun, label: 'Outdoor Seating' },
  'delivery': { icon: Truck, label: 'Delivery' },
  'atm': { icon: CreditCard, label: 'ATM' },
  'gift-wrapping': { icon: Gift, label: 'Gift Wrapping' },
  'returns': { icon: Undo2, label: 'Returns Accepted' },
};

// Normalize service names for matching
function normalizeServiceName(service: string): string {
  return service.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

interface AmenityIconsProps {
  services: string[] | null | undefined;
  maxVisible?: number;
  size?: 'sm' | 'md';
  className?: string;
  onAmenityClick?: (amenityId: string) => void;
  activeAmenityFilter?: string | null;
}

export function AmenityIcons({ 
  services, 
  maxVisible = 4, 
  size = 'sm',
  className,
  onAmenityClick,
  activeAmenityFilter,
}: AmenityIconsProps) {
  if (!services || services.length === 0) return null;

  // Map services to their configs
  const mappedAmenities = services
    .map(service => {
      const normalized = normalizeServiceName(service);
      const config = amenityConfig[normalized];
      if (config) {
        return { ...config, id: normalized };
      }
      // For unknown services, create a generic entry
      return null;
    })
    .filter(Boolean) as { icon: React.ElementType; label: string; id: string }[];

  if (mappedAmenities.length === 0) return null;

  const visibleAmenities = mappedAmenities.slice(0, maxVisible);
  const hiddenCount = mappedAmenities.length - maxVisible;
  const hiddenAmenities = mappedAmenities.slice(maxVisible);

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const containerSize = size === 'sm' ? 'h-5 w-5' : 'h-6 w-6';

  const handleClick = (e: React.MouseEvent, amenityId: string) => {
    if (onAmenityClick) {
      e.stopPropagation();
      onAmenityClick(amenityId);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("flex items-center gap-1", className)}>
        {visibleAmenities.map(({ icon: Icon, label, id }) => {
          const isActive = activeAmenityFilter === id;
          return (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <div 
                  className={cn(
                    containerSize,
                    "flex items-center justify-center rounded transition-colors",
                    onAmenityClick && "cursor-pointer",
                    isActive 
                      ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1"
                      : "bg-muted/80 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  )}
                  onClick={(e) => handleClick(e, id)}
                >
                  <Icon className={iconSize} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {onAmenityClick ? `Filter by ${label}` : label}
              </TooltipContent>
            </Tooltip>
          );
        })}
        
        {hiddenCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className={cn(
                  "h-5 px-1.5 flex items-center justify-center rounded bg-muted/80 text-muted-foreground text-xs font-medium"
                )}
              >
                +{hiddenCount}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <div className="flex flex-col gap-0.5">
                {hiddenAmenities.map(({ label, id }) => (
                  <span 
                    key={id} 
                    className={onAmenityClick ? "cursor-pointer hover:text-primary" : ""}
                    onClick={(e) => handleClick(e, id)}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

// Export amenity config for use in filter chips
export { amenityConfig };
