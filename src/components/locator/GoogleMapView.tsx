import { useEffect, useMemo } from 'react';
import { GoogleMap, MarkerF, InfoWindowF, CircleF, OverlayView } from '@react-google-maps/api';
import { Location } from '@/types';
import { LocationInfoWindow } from './LocationInfoWindow';
import { DirectionsRenderer, ROUTE_COLORS } from './DirectionsRenderer';
import { useGoogleMaps } from '@/contexts/GoogleMapsContext';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 40.7128,
  lng: -73.9560,
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
  ],
};

interface GoogleMapViewProps {
  apiKey: string; // Keep for backward compatibility but not used
  locations: Location[];
  selectedLocation: Location | null;
  onMarkerClick: (location: Location) => void;
  onInfoWindowClose: () => void;
  onMapLoad: (map: google.maps.Map) => void;
  userLocation?: { lat: number; lng: number } | null;
  routeLocations?: Location[];
  onLoadStateChange?: (isLoaded: boolean) => void;
  searchRadiusMiles?: number;
  locationsFoundCount?: number;
}

export function GoogleMapView({ 
  locations, 
  selectedLocation, 
  onMarkerClick, 
  onInfoWindowClose,
  onMapLoad,
  userLocation,
  routeLocations = [],
  onLoadStateChange,
  searchRadiusMiles,
  locationsFoundCount = 0,
}: GoogleMapViewProps) {
  // Use the centralized Google Maps context instead of calling useJsApiLoader directly
  const { isLoaded, loadError } = useGoogleMaps();

  // Notify parent of load state changes
  useEffect(() => {
    if (onLoadStateChange) {
      onLoadStateChange(isLoaded);
    }
  }, [isLoaded, onLoadStateChange]);

  // Convert miles to meters for the radius circle
  const searchRadiusMeters = searchRadiusMiles && searchRadiusMiles < 99999 
    ? searchRadiusMiles * 1609.34 
    : null;

  // Calculate position for radius label (at the top of the circle)
  const radiusLabelPosition = useMemo(() => {
    if (!userLocation || !searchRadiusMeters) return null;
    // Position label at the top edge of the circle
    // 1 degree of latitude ≈ 111,320 meters
    const latOffset = searchRadiusMeters / 111320;
    return {
      lat: userLocation.lat + latOffset,
      lng: userLocation.lng,
    };
  }, [userLocation, searchRadiusMeters]);

  // Get route color index for a location
  const getRouteColorIndex = (locationId: string): number | undefined => {
    const index = routeLocations.findIndex(loc => loc.id === locationId);
    return index >= 0 ? index : undefined;
  };

  const getMapCenter = () => {
    if (selectedLocation) {
      return { lat: selectedLocation.lat, lng: selectedLocation.lng };
    }
    if (userLocation) {
      return userLocation;
    }
    return defaultCenter;
  };

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <div className="text-center p-8">
          <p className="text-sm text-muted-foreground">Failed to load Google Maps</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={getMapCenter()}
      zoom={11}
      options={mapOptions}
      onLoad={onMapLoad}
    >
      {/* User location marker */}
      {userLocation && (
        <>
          <MarkerF
            position={userLocation}
            icon={{
              url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                  <circle fill="#3B82F6" cx="12" cy="12" r="10" stroke="white" stroke-width="3"/>
                  <circle fill="white" cx="12" cy="12" r="4"/>
                </svg>`
              )}`,
              scaledSize: new google.maps.Size(24, 24),
              anchor: new google.maps.Point(12, 12),
            }}
            title="Your location"
            zIndex={1000}
          />
          {/* Accuracy indicator circle */}
          <CircleF
            center={userLocation}
            radius={150}
            options={{
              fillColor: '#3B82F6',
              fillOpacity: 0.15,
              strokeColor: '#3B82F6',
              strokeOpacity: 0.4,
              strokeWeight: 2,
            }}
          />
          
          {/* Search radius circle */}
          {searchRadiusMeters && (
            <>
              <CircleF
                center={userLocation}
                radius={searchRadiusMeters}
                options={{
                  fillColor: '#6366F1',
                  fillOpacity: 0.06,
                  strokeColor: '#6366F1',
                  strokeOpacity: 0.4,
                  strokeWeight: 2,
                }}
              />
              {/* Radius label */}
              {radiusLabelPosition && searchRadiusMiles && (
                <OverlayView
                  position={radiusLabelPosition}
                  mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                >
                  <div 
                    className="transform -translate-x-1/2 -translate-y-full"
                    style={{ marginTop: '-8px' }}
                  >
                    <div className="bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded-full shadow-md whitespace-nowrap">
                      {locationsFoundCount} location{locationsFoundCount !== 1 ? 's' : ''} within {searchRadiusMiles} mile{searchRadiusMiles !== 1 ? 's' : ''}
                    </div>
                  </div>
                </OverlayView>
              )}
            </>
          )}
        </>
      )}

      {/* Store location markers */}
      {locations.map((location) => {
        const routeIndex = getRouteColorIndex(location.id);
        const hasRoute = routeIndex !== undefined;
        const markerColor = hasRoute 
          ? ROUTE_COLORS[routeIndex % ROUTE_COLORS.length]
          : (selectedLocation?.id === location.id ? '#4F46E5' : '#6366F1');
        
        return (
          <MarkerF
            key={location.id}
            position={{ lat: location.lat, lng: location.lng }}
            onClick={() => onMarkerClick(location)}
            icon={{
              url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
                  <path fill="${markerColor}" d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24c0-8.837-7.163-16-16-16z"/>
                  <circle fill="white" cx="16" cy="16" r="6"/>
                </svg>`
              )}`,
              scaledSize: new google.maps.Size(32, 40),
            }}
          />
        );
      })}
      
      {/* Directions routes */}
      {userLocation && routeLocations.length > 0 && (
        <DirectionsRenderer
          origin={userLocation}
          destinations={routeLocations}
        />
      )}
      
      {selectedLocation && (
        <InfoWindowF
          position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
          onCloseClick={onInfoWindowClose}
          options={{ pixelOffset: new google.maps.Size(0, -40) }}
        >
          <LocationInfoWindow location={selectedLocation} userLocation={userLocation} />
        </InfoWindowF>
      )}
    </GoogleMap>
  );
}
