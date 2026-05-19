import { useCallback, useState } from 'react';
import { GoogleMap } from '@react-google-maps/api';
import { Location } from '@/types';
import { Eye } from 'lucide-react';

interface LocationStreetViewProps {
  location: Location;
  isLoaded: boolean;
}

const containerStyle = {
  width: '100%',
  height: '100%',
};

export function LocationStreetView({ location, isLoaded }: LocationStreetViewProps) {
  const [streetViewAvailable, setStreetViewAvailable] = useState<boolean | null>(null);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    const streetViewService = new google.maps.StreetViewService();
    const position = { lat: location.lat, lng: location.lng };

    streetViewService.getPanorama(
      { location: position, radius: 50 },
      (data, status) => {
        if (status === google.maps.StreetViewStatus.OK && data?.location?.latLng) {
          setStreetViewAvailable(true);
          const panorama = map.getStreetView();
          panorama.setPosition(data.location.latLng);
          panorama.setPov({ heading: 0, pitch: 0 });
          panorama.setVisible(true);
          panorama.setOptions({
            disableDefaultUI: true,
            enableCloseButton: false,
            showRoadLabels: false,
            motionTracking: false,
            motionTrackingControl: false,
          });
        } else {
          setStreetViewAvailable(false);
        }
      }
    );
  }, [location.lat, location.lng]);

  if (!isLoaded) {
    return (
      <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Loading street view...</span>
      </div>
    );
  }

  if (streetViewAvailable === false) {
    return (
      <div className="w-full h-full bg-muted flex flex-col items-center justify-center gap-2">
        <Eye className="h-5 w-5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Street view not available</span>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={{ lat: location.lat, lng: location.lng }}
      zoom={14}
      options={{ disableDefaultUI: true }}
      onLoad={onMapLoad}
    />
  );
}
