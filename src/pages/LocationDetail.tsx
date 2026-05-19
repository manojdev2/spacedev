import { useState, useEffect } from 'react';
import { useParams, Link, useLocation as useRouterLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MapPin, Phone, Mail, Clock, ExternalLink, Car, Footprints, 
  Train, Bike, ChevronLeft, Heart, Navigation, Loader2, CalendarCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useLocation } from '@/hooks/useLocations';
import { useFavorites } from '@/hooks/useFavorites';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useGoogleMapsApiKey } from '@/hooks/useGoogleMapsApiKey';
import { useBrowsingHistory } from '@/hooks/useBrowsingHistory';
import { GoogleMapView } from '@/components/locator/GoogleMapView';
import { ShareMenu } from '@/components/locator/ShareMenu';
import { LocationReviews } from '@/components/locator/LocationReviews';
import { LocationPhotoGallery } from '@/components/locator/LocationPhotoGallery';
import { NearbyLocations } from '@/components/locator/NearbyLocations';
import { InteractiveStreetView } from '@/components/locator/InteractiveStreetView';
import { SignInPromptDialog } from '@/components/auth/SignInPromptDialog';
import { AppointmentBookingForm } from '@/components/appointments/AppointmentBookingForm';
import { categoryLabels } from '@/data/demoData';
import { calculateDistance, formatDistance } from '@/lib/distance';
import { Location as LocationType } from '@/types';

type TravelMode = 'driving' | 'walking' | 'transit' | 'bicycling';

const travelModes: { value: TravelMode; label: string; icon: React.ReactNode }[] = [
  { value: 'driving', label: 'Driving', icon: <Car className="h-4 w-4" /> },
  { value: 'walking', label: 'Walking', icon: <Footprints className="h-4 w-4" /> },
  { value: 'transit', label: 'Transit', icon: <Train className="h-4 w-4" /> },
  { value: 'bicycling', label: 'Bicycling', icon: <Bike className="h-4 w-4" /> },
];

const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const dayLabels = {
  monday: 'Monday',
  tuesday: 'Tuesday', 
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export default function LocationDetail() {
  const { id } = useParams<{ id: string }>();
  const routerLocation = useRouterLocation();
  const [signInDialogOpen, setSignInDialogOpen] = useState(false);
  const { data: location, isLoading, error } = useLocation(id);
  const { isFavorite, toggleFavorite, isAuthenticated, isToggling } = useFavorites();
  const { latitude, longitude, hasLocation, requestLocation } = useGeolocation();
  const { apiKey, isLoading: isApiKeyLoading } = useGoogleMapsApiKey();
  const { trackView } = useBrowsingHistory();
  
  // Track view when location is loaded
  useEffect(() => {
    if (location?.id) {
      trackView(location.id, 'direct');
    }
  }, [location?.id, trackView]);
  
  const currentUrl = routerLocation.pathname;
  
  const userLocation = hasLocation ? { lat: latitude!, lng: longitude! } : null;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof LocationType['openingHours'];
  
  const distance = userLocation && location
    ? calculateDistance(userLocation.lat, userLocation.lng, location.lat, location.lng)
    : null;

  const getDirectionsUrl = (mode: TravelMode = 'driving') => {
    if (!location) return '#';
    const destination = `${location.lat},${location.lng}`;
    const baseUrl = 'https://www.google.com/maps/dir/?api=1';
    const originParam = userLocation ? `&origin=${userLocation.lat},${userLocation.lng}` : '';
    return `${baseUrl}${originParam}&destination=${destination}&travelmode=${mode}`;
  };

  const handleFavoriteClick = async () => {
    if (!location) return;
    
    if (!isAuthenticated) {
      setSignInDialogOpen(true);
      return;
    }

    await toggleFavorite(location.id);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !location) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16 text-center">
          <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Location Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The location you're looking for doesn't exist or is no longer available.
          </p>
          <Button asChild>
            <Link to="/locator">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Store Locator
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const todayHours = location.openingHours[today];
  const favorited = isFavorite(location.id);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Map Section */}
      <div className="h-[300px] lg:h-[400px] relative">
        {apiKey && !isApiKeyLoading ? (
          <GoogleMapView
            apiKey={apiKey}
            locations={[location]}
            selectedLocation={location}
            onMarkerClick={() => {}}
            onInfoWindowClose={() => {}}
            onMapLoad={() => {}}
            userLocation={userLocation}
            routeLocations={userLocation ? [location] : []}
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        
        {/* Back button overlay */}
        <div className="absolute top-4 left-4">
          <Button asChild variant="secondary" size="sm" className="shadow-md">
            <Link to="/locator">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 lg:py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="xl:col-span-2 space-y-6">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant="secondary">{categoryLabels[location.category]}</Badge>
                    <Badge variant={todayHours?.isOpen ? 'default' : 'destructive'}>
                      {todayHours?.isOpen ? 'Open Now' : 'Closed'}
                    </Badge>
                  </div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">{location.name}</h1>
                  <div className="flex items-start gap-2 text-muted-foreground text-sm sm:text-base">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span className="break-words">{location.address}, {location.city}, {location.state} {location.zipCode}</span>
                  </div>
                  {distance !== null && (
                    <div className="flex items-center gap-2 mt-2 text-primary">
                      <Navigation className="h-4 w-4 flex-shrink-0" />
                      <span className="font-medium">{formatDistance(distance)} away</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleFavoriteClick}
                    disabled={isToggling}
                  >
                    <Heart className={`h-5 w-5 ${favorited ? 'fill-red-500 text-red-500' : ''}`} />
                  </Button>
                  <ShareMenu location={location} />
                </div>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3"
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="hero" size="default" className="sm:size-lg">
                    <Car className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                    Get Directions
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
              
              {/* Book Appointment Button */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="default" size="default" className="sm:size-lg">
                    <CalendarCheck className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                    Book Visit
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <AppointmentBookingForm 
                    locationId={location.id} 
                    locationName={location.name}
                  />
                </DialogContent>
              </Dialog>
              
              <Button variant="outline" size="default" className="sm:size-lg" asChild>
                <a href={`tel:${location.phone}`}>
                  <Phone className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                  Call
                </a>
              </Button>
              
              {location.website && (
                <Button variant="outline" size="default" className="sm:size-lg" asChild>
                  <a href={location.website} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                    Website
                  </a>
                </Button>
              )}
              
              {!hasLocation && (
                <Button variant="ghost" size="default" className="sm:size-lg col-span-2 sm:col-span-1" onClick={requestLocation}>
                  <Navigation className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                  Use My Location
                </Button>
              )}
            </motion.div>

            {/* Services */}
            {location.services && location.services.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Services</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {location.services.map((service, index) => (
                        <Badge key={index} variant="outline">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Photo Gallery */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <LocationPhotoGallery locationId={location.id} locationName={location.name} />
            </motion.div>

            {/* Street View */}
            {apiKey && !isApiKeyLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <InteractiveStreetView location={location} isLoaded={!!apiKey} />
              </motion.div>
            )}

            {/* Reviews Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <LocationReviews locationId={location.id} locationName={location.name} />
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Address</p>
                      <p className="text-sm text-muted-foreground">
                        {location.address}<br />
                        {location.city}, {location.state} {location.zipCode}<br />
                        {location.country}
                      </p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Phone</p>
                      <a href={`tel:${location.phone}`} className="text-sm text-primary hover:underline">
                        {location.phone}
                      </a>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Email</p>
                      <a href={`mailto:${location.email}`} className="text-sm text-primary hover:underline">
                        {location.email}
                      </a>
                    </div>
                  </div>
                  
                  {location.website && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-3">
                        <ExternalLink className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Website</p>
                          <a 
                            href={location.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            Visit website
                          </a>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Opening Hours */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Opening Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dayNames.map((day) => {
                      const hours = location.openingHours[day];
                      const isToday = day === today;
                      
                      return (
                        <div
                          key={day}
                          className={`flex justify-between text-sm py-1 px-2 rounded ${
                            isToday ? 'bg-primary/10 font-medium' : ''
                          }`}
                        >
                          <span className={isToday ? 'text-primary' : ''}>
                            {dayLabels[day]}
                            {isToday && <span className="ml-1 text-xs">(Today)</span>}
                          </span>
                          <span className={hours?.isOpen ? '' : 'text-muted-foreground'}>
                            {hours?.isOpen 
                              ? `${hours.open} - ${hours.close}`
                              : 'Closed'
                            }
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Nearby Locations */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <NearbyLocations currentLocation={location} />
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* Sign In Prompt Dialog */}
      <SignInPromptDialog
        open={signInDialogOpen}
        onOpenChange={setSignInDialogOpen}
        redirectTo={currentUrl}
      />
    </div>
  );
}
