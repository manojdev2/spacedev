import { useCallback, useState, useRef, useEffect } from 'react';
import { GoogleMap } from '@react-google-maps/api';
import { Location } from '@/types';
import { Eye, RotateCcw, ZoomIn, ZoomOut, Compass, Loader2, Maximize, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface StreetViewModalProps {
  location: Location;
  isLoaded: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const containerStyle = {
  width: '100%',
  height: '100%',
};

export function StreetViewModal({ location, isLoaded, open, onOpenChange }: StreetViewModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [streetViewAvailable, setStreetViewAvailable] = useState<boolean | null>(null);
  const [panorama, setPanorama] = useState<google.maps.StreetViewPanorama | null>(null);
  const [heading, setHeading] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  // Reset state when modal closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Exit fullscreen if active
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
      setStreetViewAvailable(null);
      setPanorama(null);
      setHeading(0);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        ref={containerRef}
        className={`max-w-4xl w-[95vw] p-0 gap-0 ${isFullscreen ? 'max-w-none w-screen h-screen rounded-none' : 'h-[80vh]'}`}
      >
        <DialogHeader className="p-4 pb-2 border-b border-border flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Street View - {location.name}
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </Button>
        </DialogHeader>
        
        <div className="flex-1 relative min-h-0">
          {!isLoaded ? (
            <div className="h-full bg-muted animate-pulse flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : streetViewAvailable === false ? (
            <div className="h-full bg-muted flex flex-col items-center justify-center gap-3">
              <Eye className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">Street View not available for this location</p>
            </div>
          ) : (
            <>
              <div className="h-full">
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
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-full px-4 py-2.5 shadow-lg border border-border">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={handleRotateLeft}
                    title="Rotate left"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={handleZoomOut}
                    title="Zoom out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={handleResetView}
                    title="Reset view"
                  >
                    <Compass className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={handleZoomIn}
                    title="Zoom in"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={handleRotateRight}
                    title="Rotate right"
                  >
                    <RotateCcw className="h-4 w-4 -scale-x-100" />
                  </Button>
                </div>
              )}

              {/* Compass Indicator */}
              {panorama && (
                <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm rounded-full p-2.5 shadow-lg border border-border">
                  <div 
                    className="w-10 h-10 flex items-center justify-center"
                    style={{ transform: `rotate(${-heading}deg)` }}
                  >
                    <Compass className="h-6 w-6 text-primary" />
                  </div>
                </div>
              )}

              {/* Loading indicator */}
              {streetViewAvailable === null && (
                <div className="absolute inset-0 bg-muted/50 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="p-3 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            Drag to look around • Use controls to zoom and rotate • Click arrows to move
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
