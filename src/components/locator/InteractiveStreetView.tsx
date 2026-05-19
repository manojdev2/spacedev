import { useCallback, useState } from 'react';
import { GoogleMap } from '@react-google-maps/api';
import { Location } from '@/types';
import { Eye, RotateCcw, ZoomIn, ZoomOut, Compass, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface InteractiveStreetViewProps {
  location: Location;
  isLoaded: boolean;
}

const containerStyle = {
  width: '100%',
  height: '100%',
};

export function InteractiveStreetView({ location, isLoaded }: InteractiveStreetViewProps) {
  const [streetViewAvailable, setStreetViewAvailable] = useState<boolean | null>(null);
  const [panorama, setPanorama] = useState<google.maps.StreetViewPanorama | null>(null);
  const [heading, setHeading] = useState(0);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    const streetViewService = new google.maps.StreetViewService();
    const position = { lat: location.lat, lng: location.lng };

    streetViewService.getPanorama(
      { location: position, radius: 100 },
      (data, status) => {
        if (status === google.maps.StreetViewStatus.OK && data?.location?.latLng) {
          setStreetViewAvailable(true);
          const pano = map.getStreetView();
          pano.setPosition(data.location.latLng);
          pano.setPov({ heading: 0, pitch: 0 });
          pano.setVisible(true);
          pano.setOptions({
            addressControl: false,
            fullscreenControl: false,
            motionTracking: false,
            motionTrackingControl: false,
            linksControl: true,
            panControl: false,
            zoomControl: false,
            enableCloseButton: false,
          });
          setPanorama(pano);

          // Track heading changes
          pano.addListener('pov_changed', () => {
            setHeading(pano.getPov().heading);
          });
        } else {
          setStreetViewAvailable(false);
        }
      }
    );
  }, [location.lat, location.lng]);

  const handleZoomIn = () => {
    if (panorama) {
      const currentZoom = panorama.getZoom();
      panorama.setZoom(Math.min(currentZoom + 0.5, 4));
    }
  };

  const handleZoomOut = () => {
    if (panorama) {
      const currentZoom = panorama.getZoom();
      panorama.setZoom(Math.max(currentZoom - 0.5, 0));
    }
  };

  const handleRotateLeft = () => {
    if (panorama) {
      const pov = panorama.getPov();
      panorama.setPov({ ...pov, heading: pov.heading - 45 });
    }
  };

  const handleRotateRight = () => {
    if (panorama) {
      const pov = panorama.getPov();
      panorama.setPov({ ...pov, heading: pov.heading + 45 });
    }
  };

  const handleResetView = () => {
    if (panorama) {
      panorama.setPov({ heading: 0, pitch: 0 });
      panorama.setZoom(1);
    }
  };

  if (!isLoaded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Street View
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-muted animate-pulse rounded-lg flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (streetViewAvailable === false) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Street View
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] bg-muted rounded-lg flex flex-col items-center justify-center gap-3">
            <Eye className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">Street View not available for this location</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Street View
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Street View Container */}
          <div className="h-[300px] lg:h-[400px] rounded-lg overflow-hidden border border-border">
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={{ lat: location.lat, lng: location.lng }}
              zoom={14}
              options={{ disableDefaultUI: true }}
              onLoad={onMapLoad}
            />
          </div>

          {/* Controls Overlay */}
          {panorama && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg border border-border">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleRotateLeft}
                title="Rotate left"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleZoomOut}
                title="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleResetView}
                title="Reset view"
              >
                <Compass className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleZoomIn}
                title="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleRotateRight}
                title="Rotate right"
              >
                <RotateCcw className="h-4 w-4 -scale-x-100" />
              </Button>
            </div>
          )}

          {/* Compass Indicator */}
          {panorama && (
            <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm rounded-full p-2 shadow-lg border border-border">
              <div 
                className="w-8 h-8 flex items-center justify-center"
                style={{ transform: `rotate(${-heading}deg)` }}
              >
                <Compass className="h-5 w-5 text-primary" />
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {streetViewAvailable === null && (
            <div className="absolute inset-0 bg-muted/50 flex items-center justify-center rounded-lg">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground mt-3">
          Drag to look around • Use controls to zoom and rotate • Click arrows to move
        </p>
      </CardContent>
    </Card>
  );
}
