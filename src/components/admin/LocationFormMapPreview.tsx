import { useCallback, useRef } from 'react';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { MapPin, Move } from 'lucide-react';

interface LocationFormMapPreviewProps {
  lat?: number;
  lng?: number;
  isLoaded: boolean;
  locationName?: string;
  onPositionChange?: (lat: number, lng: number) => void;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 40.7128,
  lng: -74.006,
};

export function LocationFormMapPreview({ 
  lat, 
  lng, 
  isLoaded,
  locationName = 'Selected Location',
  onPositionChange,
}: LocationFormMapPreviewProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const hasCoordinates = lat !== undefined && lng !== undefined && lat !== 0 && lng !== 0;
  const center = hasCoordinates ? { lat, lng } : defaultCenter;

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handleMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng && onPositionChange) {
      const newLat = e.latLng.lat();
      const newLng = e.latLng.lng();
      onPositionChange(newLat, newLng);
    }
  }, [onPositionChange]);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng && onPositionChange && hasCoordinates) {
      const newLat = e.latLng.lat();
      const newLng = e.latLng.lng();
      onPositionChange(newLat, newLng);
    }
  }, [onPositionChange, hasCoordinates]);

  if (!isLoaded) {
    return (
      <div className="h-full w-full bg-muted/50 rounded-lg flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-xs">Loading map...</p>
        </div>
      </div>
    );
  }

  if (!hasCoordinates) {
    return (
      <div className="h-full w-full bg-muted/30 rounded-lg border-2 border-dashed border-muted flex items-center justify-center">
        <div className="text-center text-muted-foreground px-4">
          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-xs">Select an address to preview location on map</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={15}
        onLoad={onLoad}
        onClick={handleMapClick}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          gestureHandling: 'cooperative',
        }}
      >
        <MarkerF
          position={center}
          title={locationName}
          draggable={!!onPositionChange}
          onDragEnd={handleMarkerDragEnd}
          animation={google.maps.Animation.DROP}
        />
      </GoogleMap>
      
      {/* Drag hint overlay */}
      {onPositionChange && (
        <div className="absolute bottom-2 left-2 right-2 bg-background/90 backdrop-blur-sm rounded-md px-2 py-1.5 flex items-center gap-2 text-xs text-muted-foreground border border-border shadow-sm">
          <Move className="h-3 w-3 shrink-0" />
          <span>Drag pin or click map to adjust location</span>
        </div>
      )}
    </div>
  );
}
