import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Heart, Car, Footprints, Train, Bike, Navigation, ExternalLink, Star, Map, Eye, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Location, LocationCategory } from '@/types';
import { categoryLabels } from '@/data/demoData';
import { calculateDistance, formatDistance } from '@/lib/distance';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useFavorites } from '@/hooks/useFavorites';
import { toast } from '@/hooks/use-toast';
import { SignInPromptDialog } from '@/components/auth/SignInPromptDialog';
import { ShareMenu } from './ShareMenu';
import { ROUTE_COLORS } from './DirectionsRenderer';
import { LocationMapPreview } from './LocationMapPreview';
import { LocationStreetView } from './LocationStreetView';
import { StreetViewModal } from './StreetViewModal';
import { AmenityIcons } from './AmenityIcons';

type TravelMode = 'driving' | 'walking' | 'transit' | 'bicycling';

const travelModes: { value: TravelMode; label: string; icon: React.ReactNode }[] = [
  { value: 'driving', label: 'Driving', icon: <Car className="h-3 w-3" /> },
  { value: 'walking', label: 'Walking', icon: <Footprints className="h-3 w-3" /> },
  { value: 'transit', label: 'Transit', icon: <Train className="h-3 w-3" /> },
  { value: 'bicycling', label: 'Bicycling', icon: <Bike className="h-3 w-3" /> },
];

interface LocationCardProps {
  location: Location;
  isSelected: boolean;
  onSelect: () => void;
  userLocation?: { lat: number; lng: number } | null;
  isRouteSelected?: boolean;
  onRouteToggle?: (locationId: string) => void;
  onRequestLocation?: () => void;
  routeColorIndex?: number;
  rating?: { average: number; count: number };
  photo?: { url: string; caption: string | null } | null;
  nearbyLocations?: Location[];
  isMapLoaded?: boolean;
  onAmenityFilter?: (amenityId: string) => void;
  activeAmenityFilter?: string | null;
  isVisited?: boolean;
}

export function LocationCard({ 
  location, 
  isSelected, 
  onSelect, 
  userLocation,
  isRouteSelected = false,
  onRouteToggle,
  onRequestLocation,
  routeColorIndex,
  rating,
  photo,
  nearbyLocations = [],
  isMapLoaded = false,
  onAmenityFilter,
  activeAmenityFilter,
  isVisited = false,
}: LocationCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [showMapPreview, setShowMapPreview] = useState(isSelected);
  const [previewCategoryFilter, setPreviewCategoryFilter] = useState<LocationCategory | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'street'>('map');
  const [streetViewModalOpen, setStreetViewModalOpen] = useState(false);
  const [signInDialogOpen, setSignInDialogOpen] = useState(false);
  const routerLocation = useLocation();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof Location['openingHours'];
  const todayHours = location.openingHours[today];
  const { isFavorite, toggleFavorite, isAuthenticated, isToggling } = useFavorites();
  
  // Build redirect URL for sign-in
  const currentUrl = routerLocation.pathname + routerLocation.search;
  // Auto-show map preview and scroll into view when selected
  useEffect(() => {
    if (isSelected) {
      setShowMapPreview(true);
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isSelected]);

  const distance = userLocation
    ? calculateDistance(userLocation.lat, userLocation.lng, location.lat, location.lng)
    : null;

  const handleRouteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userLocation) {
      // Auto-trigger geolocation request instead of showing error
      if (onRequestLocation) {
        onRequestLocation();
        toast({
          title: 'Requesting location',
          description: 'Once enabled, you can show routes on the map.',
        });
      }
      return;
    }
    onRouteToggle?.(location.id);
  };

  const routeColor = routeColorIndex !== undefined ? ROUTE_COLORS[routeColorIndex % ROUTE_COLORS.length] : undefined;

  const getDirectionsUrl = (mode: TravelMode = 'driving') => {
    const destination = `${location.lat},${location.lng}`;
    const baseUrl = 'https://www.google.com/maps/dir/?api=1';
    const originParam = userLocation ? `&origin=${userLocation.lat},${userLocation.lng}` : '';
    return `${baseUrl}${originParam}&destination=${destination}&travelmode=${mode}`;
  };

  const handleDirectionsClick = (e: React.MouseEvent, mode: TravelMode) => {
    e.stopPropagation();
    window.open(getDirectionsUrl(mode), '_blank', 'noopener,noreferrer');
  };

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isAuthenticated) {
      setSignInDialogOpen(true);
      return;
    }

    try {
      await toggleFavorite(location.id);
      toast({
        title: isFavorite(location.id) ? 'Removed from favorites' : 'Added to favorites',
        description: isFavorite(location.id) 
          ? `${location.name} was removed from your favorites.`
          : `${location.name} was added to your favorites.`,
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update favorites. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const favorited = isFavorite(location.id);
  
  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
        isSelected 
          ? 'border-primary bg-primary/5 shadow-md' 
          : 'border-border bg-card hover:border-primary/50 hover:shadow-sm'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        {/* Route checkbox */}
        {onRouteToggle && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className={`flex items-center justify-center shrink-0 pt-1 ${!userLocation ? 'cursor-not-allowed' : ''}`}
                  onClick={handleRouteToggle}
                >
                  <Checkbox 
                    checked={isRouteSelected}
                    className={`h-5 w-5 ${!userLocation ? 'opacity-50' : ''}`}
                    style={isRouteSelected && routeColor ? { 
                      backgroundColor: routeColor, 
                      borderColor: routeColor 
                    } : undefined}
                  />
                </div>
              </TooltipTrigger>
              {!userLocation && (
                <TooltipContent side="right" className="flex flex-col items-center gap-1">
                  <p>Enable location to show routes</p>
                  {onRequestLocation && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRequestLocation();
                      }}
                      className="text-primary hover:underline font-medium flex items-center gap-1"
                    >
                      <Navigation className="h-3 w-3" />
                      Near Me →
                    </button>
                  )}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )}
        
        {/* Photo thumbnail or icon */}
        {photo ? (
          <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-muted">
            <img 
              src={photo.url} 
              alt={photo.caption || location.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            isSelected ? 'bg-primary' : 'bg-primary/10'
          }`}
          style={isRouteSelected && routeColor ? { backgroundColor: routeColor } : undefined}
          >
            <MapPin className={`h-5 w-5 ${isSelected || isRouteSelected ? 'text-primary-foreground' : 'text-primary'}`} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-semibold text-sm truncate">{location.name}</h3>
              {isVisited && (
                <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0 h-4 gap-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  Visited
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {distance !== null && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Navigation className="h-3 w-3" />
                  {formatDistance(distance)}
                </span>
              )}
              <button
                onClick={handleFavoriteClick}
                disabled={isToggling}
                className="p-1 rounded-full hover:bg-muted transition-colors disabled:opacity-50"
                aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart 
                  className={`h-4 w-4 transition-colors ${
                    favorited 
                      ? 'fill-red-500 text-red-500' 
                      : 'text-muted-foreground hover:text-red-500'
                  }`} 
                />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="truncate">{location.address}, {location.city}</span>
            {rating && rating.count > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-0.5 shrink-0 text-amber-500">
                  <Star className="h-3 w-3 fill-current" />
                  <span className="font-medium">{rating.average.toFixed(1)}</span>
                  <span className="text-muted-foreground">({rating.count})</span>
                </span>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground whitespace-nowrap">
              {categoryLabels[location.category]}
            </span>
            <span className={`text-xs whitespace-nowrap ${todayHours?.isOpen ? 'text-success' : 'text-destructive'}`}>
              {todayHours?.isOpen ? `Open until ${todayHours.close}` : 'Closed'}
            </span>
            
            {/* Amenity Icons */}
            <AmenityIcons 
              services={location.services} 
              maxVisible={4} 
              onAmenityClick={onAmenityFilter}
              activeAmenityFilter={activeAmenityFilter}
            />
            
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (showMapPreview && viewMode === 'map') {
                    setShowMapPreview(false);
                  } else {
                    setShowMapPreview(true);
                    setViewMode('map');
                  }
                }}
                className="p-1.5 rounded hover:bg-muted transition-colors"
                title="Show map preview"
              >
                <Map className={`h-3.5 w-3.5 ${showMapPreview && viewMode === 'map' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (showMapPreview && viewMode === 'street') {
                    setShowMapPreview(false);
                  } else {
                    setShowMapPreview(true);
                    setViewMode('street');
                  }
                }}
                className="p-1.5 rounded hover:bg-muted transition-colors"
                title="Show street view"
              >
                <Eye className={`h-3.5 w-3.5 ${showMapPreview && viewMode === 'street' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`} />
              </button>
              <Link
                to={`/location/${location.id}`}
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded hover:bg-muted transition-colors"
                title="View details"
              >
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </Link>
              <ShareMenu location={location} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-xs whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Car className="h-3 w-3 mr-1" />
                    Directions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {travelModes.map((mode) => (
                    <DropdownMenuItem 
                      key={mode.value}
                      onClick={(e) => handleDirectionsClick(e as unknown as React.MouseEvent, mode.value)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      {mode.icon}
                      {mode.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
      
      {/* Map Preview */}
      <AnimatePresence>
        {showMapPreview && isMapLoaded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3"
          >
            {/* Category filter chips */}
            {nearbyLocations.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewCategoryFilter(null);
                  }}
                  className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                    previewCategoryFilter === null
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  All ({nearbyLocations.length})
                </button>
                {Array.from(new Set(nearbyLocations.map(l => l.category))).map((cat) => {
                  const count = nearbyLocations.filter(l => l.category === cat).length;
                  return (
                    <button
                      key={cat}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewCategoryFilter(previewCategoryFilter === cat ? null : cat);
                      }}
                      className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                        previewCategoryFilter === cat
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {categoryLabels[cat]} ({count})
                    </button>
                  );
                })}
              </div>
            )}
            
            {/* Map or Street View */}
            <div 
              className={`h-[120px] rounded-lg overflow-hidden border border-border ${viewMode === 'street' ? 'cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all' : ''}`}
              onClick={(e) => {
                if (viewMode === 'street') {
                  e.stopPropagation();
                  setStreetViewModalOpen(true);
                }
              }}
              title={viewMode === 'street' ? 'Click to expand Street View' : undefined}
            >
              {viewMode === 'map' ? (
                <LocationMapPreview
                  location={location}
                  nearbyLocations={
                    previewCategoryFilter
                      ? nearbyLocations.filter(l => l.category === previewCategoryFilter)
                      : nearbyLocations
                  }
                  isLoaded={isMapLoaded}
                />
              ) : (
                <LocationStreetView
                  location={location}
                  isLoaded={isMapLoaded}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Street View Modal */}
      <StreetViewModal
        location={location}
        isLoaded={isMapLoaded}
        open={streetViewModalOpen}
        onOpenChange={setStreetViewModalOpen}
      />
      
      {/* Sign In Prompt Dialog */}
      <SignInPromptDialog
        open={signInDialogOpen}
        onOpenChange={setSignInDialogOpen}
        redirectTo={currentUrl}
      />
    </motion.div>
  );
}
