import { MapPin, Phone, Mail, Clock, ExternalLink, Car, Footprints, Train, Bike } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Location } from '@/types';
import { categoryLabels } from '@/data/demoData';

interface LocationInfoWindowProps {
  location: Location;
  userLocation?: { lat: number; lng: number } | null;
}

type TravelMode = 'driving' | 'walking' | 'transit' | 'bicycling';

const travelModes: { value: TravelMode; label: string; icon: React.ReactNode }[] = [
  { value: 'driving', label: 'Driving', icon: <Car className="h-4 w-4" /> },
  { value: 'walking', label: 'Walking', icon: <Footprints className="h-4 w-4" /> },
  { value: 'transit', label: 'Transit', icon: <Train className="h-4 w-4" /> },
  { value: 'bicycling', label: 'Bicycling', icon: <Bike className="h-4 w-4" /> },
];

export function LocationInfoWindow({ location, userLocation }: LocationInfoWindowProps) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof Location['openingHours'];
  const todayHours = location.openingHours[today];
  
  const getDirectionsUrl = (mode: TravelMode = 'driving') => {
    const destination = `${location.lat},${location.lng}`;
    const baseUrl = 'https://www.google.com/maps/dir/?api=1';
    const originParam = userLocation ? `&origin=${userLocation.lat},${userLocation.lng}` : '';
    return `${baseUrl}${originParam}&destination=${destination}&travelmode=${mode}`;
  };
  
  return (
    <div className="p-4 max-w-xs">
      <h3 className="font-bold text-lg mb-1">{location.name}</h3>
      <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary mb-3">
        {categoryLabels[location.category]}
      </span>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
          <span>{location.address}, {location.city}, {location.state} {location.zipCode}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <a href={`tel:${location.phone}`} className="text-primary hover:underline">
            {location.phone}
          </a>
        </div>
        
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <a href={`mailto:${location.email}`} className="text-primary hover:underline">
            {location.email}
          </a>
        </div>
        
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className={todayHours?.isOpen ? 'text-success' : 'text-destructive'}>
            {todayHours?.isOpen 
              ? `Open today: ${todayHours.open} - ${todayHours.close}`
              : 'Closed today'
            }
          </span>
        </div>
      </div>
      
      <div className="flex gap-2 mt-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" size="sm" className="flex-1">
              <Car className="h-4 w-4 mr-1" />
              Directions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {travelModes.map((mode) => (
              <DropdownMenuItem key={mode.value} asChild>
                <a 
                  href={getDirectionsUrl(mode.value)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  {mode.icon}
                  {mode.label}
                </a>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {location.website && (
          <a href={location.website} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}
