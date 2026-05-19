import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapPin, Search, Navigation, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePublicLocations } from '@/hooks/useLocations';
import { useGoogleMapsApiKey } from '@/hooks/useGoogleMapsApiKey';
import { useGeolocation } from '@/hooks/useGeolocation';
import { GoogleMapView } from '@/components/locator/GoogleMapView';
import { calculateDistance, formatDistance } from '@/lib/distance';
import { fuzzyMatch } from '@/lib/fuzzyMatch';
import { Location } from '@/types';

interface WidgetConfig {
  primaryColor: string;
  accentColor: string;
  showSearch: boolean;
  showNearMe: boolean;
  showList: boolean;
  showMap: boolean;
  height: string;
  borderRadius: string;
  showBranding: boolean;
  maxResults: number;
  defaultZoom: number;
}

function parseConfig(searchParams: URLSearchParams): WidgetConfig {
  return {
    primaryColor: searchParams.get('primaryColor') || '#0d9488',
    accentColor: searchParams.get('accentColor') || '#14b8a6',
    showSearch: searchParams.get('showSearch') !== 'false',
    showNearMe: searchParams.get('showNearMe') !== 'false',
    showList: searchParams.get('showList') !== 'false',
    showMap: searchParams.get('showMap') !== 'false',
    height: searchParams.get('height') || '500px',
    borderRadius: searchParams.get('borderRadius') || '12px',
    showBranding: searchParams.get('showBranding') !== 'false',
    maxResults: parseInt(searchParams.get('maxResults') || '10'),
    defaultZoom: parseInt(searchParams.get('defaultZoom') || '10'),
  };
}

export default function EmbedWidget() {
  const [searchParams] = useSearchParams();
  const config = useMemo(() => parseConfig(searchParams), [searchParams]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);
  
  const { data: locations = [], isLoading: isLocationsLoading } = usePublicLocations();
  const { apiKey, isLoading: isApiKeyLoading } = useGoogleMapsApiKey();
  const { 
    latitude, 
    longitude, 
    isLoading: isGeoLoading, 
    requestLocation,
    hasLocation 
  } = useGeolocation({});

  const userLocation = hasLocation ? { lat: latitude!, lng: longitude! } : null;

  // Apply custom CSS variables
  useEffect(() => {
    document.documentElement.style.setProperty('--widget-primary', config.primaryColor);
    document.documentElement.style.setProperty('--widget-accent', config.accentColor);
  }, [config.primaryColor, config.accentColor]);

  const filteredLocations = useMemo(() => {
    let filtered = locations;
    
    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter((location) => 
        fuzzyMatch(searchQuery, location.name) ||
        fuzzyMatch(searchQuery, location.city) ||
        fuzzyMatch(searchQuery, location.address) ||
        fuzzyMatch(searchQuery, location.zipCode)
      );
    }
    
    // Sort by distance if user location is available
    if (userLocation) {
      filtered = [...filtered].sort((a, b) => {
        const distA = calculateDistance(userLocation.lat, userLocation.lng, a.lat, a.lng);
        const distB = calculateDistance(userLocation.lat, userLocation.lng, b.lat, b.lng);
        return distA - distB;
      });
    }
    
    return filtered.slice(0, config.maxResults);
  }, [locations, searchQuery, userLocation, config.maxResults]);

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
    if (mapRef) {
      mapRef.panTo({ lat: location.lat, lng: location.lng });
      mapRef.setZoom(14);
    }
  };

  const handleMarkerClick = (location: Location) => {
    setSelectedLocation(location);
  };

  const getDirectionsUrl = (location: Location) => {
    const destination = encodeURIComponent(`${location.address}, ${location.city}, ${location.state} ${location.zipCode}`);
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  };

  // Custom styles
  const widgetStyles = {
    '--primary-color': config.primaryColor,
    '--accent-color': config.accentColor,
  } as React.CSSProperties;

  const isLoading = isLocationsLoading || isApiKeyLoading;

  return (
    <div 
      className="w-full bg-white dark:bg-gray-900 overflow-hidden font-sans"
      style={{ 
        ...widgetStyles,
        height: config.height,
        borderRadius: config.borderRadius,
      }}
    >
      <div className="h-full flex flex-col">
        {/* Search Header */}
        {(config.showSearch || config.showNearMe) && (
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex gap-2">
              {config.showSearch && (
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search locations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-sm bg-white dark:bg-gray-900"
                  />
                </div>
              )}
              {config.showNearMe && (
                <Button
                  variant={hasLocation ? 'default' : 'outline'}
                  size="sm"
                  onClick={requestLocation}
                  disabled={isGeoLoading}
                  className="h-9 shrink-0"
                  style={{ 
                    backgroundColor: hasLocation ? config.primaryColor : undefined,
                  }}
                >
                  {isGeoLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Navigation className="h-4 w-4" />
                  )}
                  <span className="ml-1 hidden sm:inline">Near Me</span>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className={`flex-1 flex min-h-0 ${config.showList && config.showMap ? 'flex-row' : ''}`}>
          {/* Location List */}
          {config.showList && (
            <div className={`${config.showMap ? 'w-1/2 border-r border-gray-200 dark:border-gray-700' : 'w-full'} overflow-y-auto`}>
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : filteredLocations.length > 0 ? (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredLocations.map((location) => {
                    const distance = userLocation 
                      ? calculateDistance(userLocation.lat, userLocation.lng, location.lat, location.lng)
                      : null;
                    
                    return (
                      <button
                        key={location.id}
                        onClick={() => handleLocationSelect(location)}
                        className={`w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                          selectedLocation?.id === location.id ? 'bg-gray-100 dark:bg-gray-800' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <MapPin 
                            className="h-4 w-4 mt-0.5 shrink-0" 
                            style={{ color: config.primaryColor }}
                          />
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                              {location.name}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {location.address}, {location.city}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {distance !== null && (
                                <span className="text-xs font-medium" style={{ color: config.primaryColor }}>
                                  {formatDistance(distance)}
                                </span>
                              )}
                              <a
                                href={getDirectionsUrl(location)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs text-blue-600 hover:underline inline-flex items-center gap-0.5"
                              >
                                Directions
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                  <MapPin className="h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No locations found</p>
                </div>
              )}
            </div>
          )}

          {/* Map */}
          {config.showMap && (
            <div className={`${config.showList ? 'w-1/2' : 'w-full'} h-full`}>
              {apiKey ? (
                <GoogleMapView
                  apiKey={apiKey}
                  locations={filteredLocations}
                  selectedLocation={selectedLocation}
                  onMarkerClick={handleMarkerClick}
                  onInfoWindowClose={() => setSelectedLocation(null)}
                  onMapLoad={setMapRef}
                  userLocation={userLocation}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Branding Footer */}
        {config.showBranding && (
          <div className="px-3 py-1.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <a
               href="https://locatepro.app"
               target="_blank"
               rel="noopener noreferrer"
               className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
             >
               Powered by <span className="font-medium">LocatePro</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
