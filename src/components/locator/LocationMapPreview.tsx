import { useMemo } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { Location } from '@/types';

interface LocationMapPreviewProps {
  location: Location;
  nearbyLocations?: Location[];
  isLoaded: boolean;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  clickableIcons: false,
  gestureHandling: 'none',
};

export function LocationMapPreview({ location, nearbyLocations = [], isLoaded }: LocationMapPreviewProps) {
  const center = useMemo(() => ({
    lat: location.lat,
    lng: location.lng,
  }), [location.lat, location.lng]);

  if (!isLoaded) {
    return (
      <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Loading map...</span>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={14}
      options={mapOptions}
    >
      {/* Main location marker */}
      <Marker
        position={{ lat: location.lat, lng: location.lng }}
        icon={{
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: 'hsl(var(--primary))',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        }}
      />
      
      {/* Nearby location markers */}
      {nearbyLocations.slice(0, 5).map((nearby) => (
        <Marker
          key={nearby.id}
          position={{ lat: nearby.lat, lng: nearby.lng }}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: 'hsl(var(--muted-foreground))',
            fillOpacity: 0.7,
            strokeColor: '#ffffff',
            strokeWeight: 1,
          }}
        />
      ))}
    </GoogleMap>
  );
}
