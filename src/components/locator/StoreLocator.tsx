import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Filter, X, Navigation, Loader2, Heart, RefreshCw, Route, Sparkles, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLocationStore } from '@/store/useLocationStore';
import { usePublicLocations } from '@/hooks/useLocations';
import { useAllLocationRatings } from '@/hooks/useLocationRatings';
import { useLocationsPhotos } from '@/hooks/useLocationsPhotos';
import { Location, LocationCategory } from '@/types';
import { useGoogleMapsApiKey } from '@/hooks/useGoogleMapsApiKey';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useFavorites } from '@/hooks/useFavorites';
import { useLocationsRealtime } from '@/hooks/useLocationsRealtime';
import { useViewedLocationIds } from '@/hooks/useViewedLocationIds';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { GoogleMapView } from './GoogleMapView';
import { LocationCard } from './LocationCard';
import { SearchAutocomplete } from './SearchAutocomplete';
import { SmartSearchBar } from './SmartSearchBar';
import { StoreRecommendations } from './StoreRecommendations';
import { RecentlyViewed } from './RecentlyViewed';
import { amenityConfig } from './AmenityIcons';
import { toast } from '@/hooks/use-toast';
import { calculateDistance } from '@/lib/distance';
import { AISearchIntent } from '@/hooks/useAISearch';

const categories: { value: LocationCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'retail', label: 'Retail Store' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'service-center', label: 'Service Center' },
  { value: 'headquarters', label: 'Headquarters' },
  { value: 'branch', label: 'Branch Office' },
];

export function StoreLocator() {
  const { filters, setFilters, selectedLocation, setSelectedLocation, getFilteredLocations } = useLocationStore();
  const { data: locations = [], isLoading: isLocationsLoading, refetch, dataUpdatedAt } = usePublicLocations();
  const { data: ratingsMap = {} } = useAllLocationRatings();
  
  // Fetch first photo for all locations
  const locationIds = useMemo(() => locations.map(l => l.id), [locations]);
  const { data: photosMap = {} } = useLocationsPhotos(locationIds);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [isLocationBannerDismissed, setIsLocationBannerDismissed] = useState(false);
  const [selectedRouteIds, setSelectedRouteIds] = useState<Set<string>>(new Set());
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [liveTrackingEnabled, setLiveTrackingEnabled] = useState(false);
  const [useMyLocation, setUseMyLocation] = useState(false);
  const [useSmartSearch, setUseSmartSearch] = useState(true);
  const [aiIntent, setAiIntent] = useState<AISearchIntent | null>(null);
  const [amenityFilter, setAmenityFilter] = useState<string | null>(null);
  
  // Fetch API key from edge function
  const { apiKey, isLoading: isApiKeyLoading, error: apiKeyError } = useGoogleMapsApiKey();
  
  // Geolocation with watch mode for continuous updates (only if enabled)
  const { 
    latitude, 
    longitude, 
    error: geoError, 
    isLoading: isGeoLoading, 
    requestLocation, 
    startWatching,
    stopWatching,
    isWatching,
    hasLocation 
  } = useGeolocation({ watch: liveTrackingEnabled, distanceThreshold: 100 });
  
  // Favorites
  const { favorites, isFavorite, isAuthenticated } = useFavorites();
  
  // Viewed locations (for "Visited" badge)
  const { viewedIds } = useViewedLocationIds();
  
  // Real-time subscription to location changes
  useLocationsRealtime();
  
  // Auto-refresh every 30 seconds
  useAutoRefresh({
    interval: 30000,
    enabled: autoRefreshEnabled,
    queryKeys: [['locations', 'public']],
  });
  
  const userLocation = (useMyLocation && hasLocation) ? { lat: latitude!, lng: longitude! } : null;
  
  // Format last updated time
  const lastUpdatedText = useMemo(() => {
    if (!dataUpdatedAt) return '';
    const seconds = Math.floor((Date.now() - dataUpdatedAt) / 1000);
    if (seconds < 60) return 'Updated just now';
    const minutes = Math.floor(seconds / 60);
    return `Updated ${minutes}m ago`;
  }, [dataUpdatedAt]);

  const filteredLocations = useMemo(() => {
    let filtered = getFilteredLocations(locations);
    
    // Apply AI intent filters if active
    if (aiIntent) {
      // Category filter from AI
      if (aiIntent.category) {
        filtered = filtered.filter((location) => location.category === aiIntent.category);
      }
      
      // City filter from AI
      if (aiIntent.city) {
        const cityLower = aiIntent.city.toLowerCase();
        filtered = filtered.filter((location) => 
          location.city.toLowerCase().includes(cityLower)
        );
      }
      
      // State filter from AI
      if (aiIntent.state) {
        const stateLower = aiIntent.state.toLowerCase();
        filtered = filtered.filter((location) => 
          location.state.toLowerCase().includes(stateLower)
        );
      }
      
      // Services filter from AI
      if (aiIntent.services.length > 0) {
        filtered = filtered.filter((location) => {
          const locationServices = location.services?.map(s => s.toLowerCase()) || [];
          return aiIntent.services.some(service => 
            locationServices.some(ls => ls.includes(service.toLowerCase()))
          );
        });
      }
      
      // Radius filter from AI (if user location is available)
      if (aiIntent.radius && userLocation) {
        filtered = filtered.filter((location) => {
          const distance = calculateDistance(userLocation.lat, userLocation.lng, location.lat, location.lng);
          return distance <= aiIntent.radius!;
        });
      }
      
      // Open now filter from AI
      if (aiIntent.openNow || aiIntent.openLate) {
        const now = new Date();
        const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()] as keyof Location['openingHours'];
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTimeNum = currentHour * 100 + currentMinute;
        
        filtered = filtered.filter((location) => {
          const dayHours = location.openingHours?.[currentDay];
          if (!dayHours || !dayHours.isOpen) return false;
          
          const openTime = parseInt(dayHours.open.replace(':', ''));
          const closeTime = parseInt(dayHours.close.replace(':', ''));
          
          // For open now check
          if (aiIntent.openNow) {
            if (currentTimeNum < openTime || currentTimeNum > closeTime) return false;
          }
          
          // For open late check (after 8 PM = 2000)
          if (aiIntent.openLate) {
            if (closeTime < 2000) return false;
          }
          
          return true;
        });
      }
    }
    
    // Apply favorites filter
    if (showFavoritesOnly && isAuthenticated) {
      filtered = filtered.filter((location) => isFavorite(location.id));
    }
    
    // Apply amenity filter
    if (amenityFilter) {
      filtered = filtered.filter((location) => {
        const locationServices = location.services?.map(s => 
          s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        ) || [];
        return locationServices.includes(amenityFilter);
      });
    }
    
    // Apply radius filter if user location is available (non-AI)
    if (!aiIntent && userLocation && filters.radius) {
      filtered = filtered.filter((location) => {
        const distance = calculateDistance(userLocation.lat, userLocation.lng, location.lat, location.lng);
        return distance <= filters.radius;
      });
    }
    
    // Sort by distance if user location is available or AI requests it
    if (userLocation && (aiIntent?.sortByDistance || !aiIntent)) {
      return [...filtered].sort((a, b) => {
        const distA = calculateDistance(userLocation.lat, userLocation.lng, a.lat, a.lng);
        const distB = calculateDistance(userLocation.lat, userLocation.lng, b.lat, b.lng);
        return distA - distB;
      });
    }
    
    return filtered;
  }, [getFilteredLocations, locations, filters, userLocation, showFavoritesOnly, isAuthenticated, isFavorite, favorites, aiIntent, amenityFilter]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMapRef(map);
  }, []);

  const handleLocateMe = () => {
    if (useMyLocation) {
      // Disable location-based features
      setUseMyLocation(false);
      setLiveTrackingEnabled(false);
      stopWatching();
      toast({
        title: 'Location disabled',
        description: 'Showing all locations without distance filtering.',
      });
    } else {
      // Enable location
      setUseMyLocation(true);
      requestLocation();
    }
  };

  const handleToggleLiveTracking = () => {
    if (liveTrackingEnabled) {
      setLiveTrackingEnabled(false);
      stopWatching();
    } else {
      setLiveTrackingEnabled(true);
      startWatching();
    }
  };

  const handleManualRefresh = async () => {
    await refetch();
    toast({
      title: 'Locations refreshed',
      description: 'The location list has been updated.',
    });
  };

  // Don't auto-request geolocation on mount - let user enable it manually
  // This allows users to search any location without location permission

  // Center map on user location when obtained and "Near Me" is enabled
  useEffect(() => {
    if (useMyLocation && hasLocation && mapRef) {
      mapRef.panTo({ lat: latitude!, lng: longitude! });
      mapRef.setZoom(13);
    }
  }, [useMyLocation, hasLocation, latitude, longitude, mapRef]);

  // Show error toast if geolocation fails
  useEffect(() => {
    if (geoError) {
      toast({
        title: 'Location Error',
        description: geoError,
        variant: 'destructive',
      });
    }
  }, [geoError]);

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

  const clearFilters = () => {
    setFilters({ query: '', category: 'all', city: '' });
    setShowFavoritesOnly(false);
    setSelectedRouteIds(new Set());
    setAiIntent(null);
    setAmenityFilter(null);
  };

  const hasActiveFilters = filters.query || filters.category !== 'all' || filters.city || showFavoritesOnly || aiIntent || amenityFilter;

  const handleAmenityFilter = (amenityId: string) => {
    // Toggle filter - if same amenity clicked, clear it
    setAmenityFilter(prev => prev === amenityId ? null : amenityId);
  };

  const handleAISearchResult = (intent: AISearchIntent) => {
    setAiIntent(intent);
    
    // If AI detected "near me" intent, enable location
    if (intent.sortByDistance && !useMyLocation) {
      setUseMyLocation(true);
      requestLocation();
    }
    
    toast({
      title: 'AI Search Applied',
      description: intent.interpretation,
    });
  };

  const handleClearAISearch = () => {
    setAiIntent(null);
  };

  const handleFavoritesToggle = () => {
    if (!isAuthenticated) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to view your favorite locations.',
        variant: 'destructive',
      });
      return;
    }
    setShowFavoritesOnly(!showFavoritesOnly);
  };

  const handleRouteToggle = (locationId: string) => {
    setSelectedRouteIds((prev) => {
      const next = new Set(prev);
      if (next.has(locationId)) {
        next.delete(locationId);
      } else {
        next.add(locationId);
      }
      return next;
    });
  };

  const routeLocations = useMemo(() => {
    return filteredLocations.filter((loc) => selectedRouteIds.has(loc.id));
  }, [filteredLocations, selectedRouteIds]);

  const getRouteColorIndex = (locationId: string): number | undefined => {
    const index = routeLocations.findIndex((loc) => loc.id === locationId);
    return index >= 0 ? index : undefined;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Geolocation status indicator - only show when useMyLocation is enabled */}
        {useMyLocation && !isLocationBannerDismissed && (isGeoLoading || geoError || hasLocation) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-4 flex items-center gap-3 p-3 rounded-lg border ${
              isGeoLoading 
                ? 'bg-primary/10 border-primary/20' 
                : geoError 
                  ? 'bg-destructive/10 border-destructive/20' 
                  : 'bg-primary/10 border-primary/20'
            }`}
          >
            {isGeoLoading ? (
              <>
                <div className="relative">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                </div>
                <span className="text-sm text-primary font-medium">Requesting location permission...</span>
              </>
            ) : geoError ? (
              <>
                <X className="h-4 w-4 text-destructive" />
                <span className="text-sm text-destructive font-medium">{geoError}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={requestLocation}
                  className="ml-auto h-7 text-xs"
                >
                  Try again
                </Button>
              </>
            ) : hasLocation ? (
              <motion.div 
                className="flex items-center gap-3 flex-1"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
              >
                <Navigation className="h-4 w-4 text-primary" />
                <span className="text-sm text-primary font-medium">Location enabled</span>
                {isWatching && liveTrackingEnabled && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    Live tracking
                  </span>
                )}
                {/* Live tracking toggle */}
                <Button
                  variant={liveTrackingEnabled ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleToggleLiveTracking}
                  className="h-6 text-xs ml-2"
                >
                  {liveTrackingEnabled ? 'Tracking ON' : 'Tracking OFF'}
                </Button>
              </motion.div>
            ) : null}
            
            {/* Dismiss button - show for error and success states, not loading */}
            {!isGeoLoading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsLocationBannerDismissed(true)}
                className="h-7 w-7 p-0 ml-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </motion.div>
        )}

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold">Find a Location</h1>
            <Button
              variant={useSmartSearch ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUseSmartSearch(!useSmartSearch)}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">AI Search</span>
              <span className="sm:hidden">AI</span>
            </Button>
          </div>
          <p className="text-muted-foreground">
            {useSmartSearch 
              ? 'Use natural language to find exactly what you need.'
              : 'Search for stores, service centers, and branches near you.'
            }
          </p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col gap-4 mb-6">
          {useSmartSearch ? (
            <SmartSearchBar
              onSearchResult={handleAISearchResult}
              onClear={handleClearAISearch}
              userLocation={userLocation}
            />
          ) : (
            <SearchAutocomplete
              locations={locations}
              value={filters.query}
              onChange={(query) => setFilters({ query })}
              onSelect={handleLocationSelect}
              placeholder="Search by name, address, city, or zip code..."
            />
          )}
          
          <div className="flex flex-wrap gap-2">
            <Button
              variant={useMyLocation ? 'default' : 'outline'}
              onClick={handleLocateMe}
              disabled={isGeoLoading}
              className="h-10 flex-1 sm:flex-none"
            >
              {isGeoLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Navigation className="h-4 w-4 mr-2" />
              )}
              <span className="hidden sm:inline">{useMyLocation ? 'Disable Location' : 'Near Me'}</span>
              <span className="sm:hidden">{useMyLocation ? 'Location Off' : 'Near Me'}</span>
            </Button>
            <Button
              variant={showFavoritesOnly ? 'default' : 'outline'}
              onClick={handleFavoritesToggle}
              className="h-10 flex-1 sm:flex-none"
            >
              <Heart className={`h-4 w-4 sm:mr-2 ${showFavoritesOnly ? 'fill-current' : ''}`} />
              <span className="hidden sm:inline">Favorites</span>
            </Button>
            <Button
              variant={isFilterOpen ? 'default' : 'outline'}
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="h-10 flex-1 sm:flex-none"
            >
              <Filter className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilters && (
                <span className="ml-1 sm:ml-2 w-5 h-5 rounded-full bg-primary-foreground text-primary text-xs flex items-center justify-center">
                  !
                </span>
              )}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} className="h-10">
                <X className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Clear</span>
              </Button>
            )}
          </div>
        </div>

        {/* Filter Panel */}
        {isFilterOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-4 rounded-xl border border-border bg-card"
          >
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Select
                  value={filters.category}
                  onValueChange={(value) => setFilters({ category: value as LocationCategory | 'all' })}
                >
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">City</label>
                <Input
                  placeholder="Filter by city..."
                  value={filters.city}
                  onChange={(e) => setFilters({ city: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Max Distance {!hasLocation && <span className="text-muted-foreground font-normal">(enable location)</span>}
                </label>
                <Select
                  value={String(filters.radius)}
                  onValueChange={(value) => setFilters({ radius: parseInt(value) })}
                  disabled={!hasLocation}
                >
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Select distance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">Within 5 miles</SelectItem>
                    <SelectItem value="10">Within 10 miles</SelectItem>
                    <SelectItem value="25">Within 25 miles</SelectItem>
                    <SelectItem value="50">Within 50 miles</SelectItem>
                    <SelectItem value="100">Within 100 miles</SelectItem>
                    <SelectItem value="99999">Any distance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>
        )}

        {/* Results count & refresh status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <p className="text-sm text-muted-foreground">
              {isLocationsLoading ? 'Loading locations...' : `Showing ${filteredLocations.length} location${filteredLocations.length !== 1 ? 's' : ''}`}
            </p>
            {selectedRouteIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-primary flex items-center gap-1">
                  <Route className="h-4 w-4" />
                  {selectedRouteIds.size} route{selectedRouteIds.size !== 1 ? 's' : ''}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRouteIds(new Set())}
                  className="h-6 px-2 text-xs"
                >
                  Clear
                </Button>
              </div>
            )}
            {amenityFilter && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-primary flex items-center gap-1.5 bg-primary/10 px-2 py-1 rounded-full">
                  <Filter className="h-3 w-3" />
                  {amenityConfig[amenityFilter]?.label || amenityFilter}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAmenityFilter(null)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {lastUpdatedText && (
              <span className="text-xs text-muted-foreground hidden sm:inline">{lastUpdatedText}</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isLocationsLoading}
              className="h-8 px-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLocationsLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant={autoRefreshEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              className="h-8 text-xs"
            >
              <span className="hidden sm:inline">Auto-refresh</span>
              <span className="sm:hidden">Auto</span> {autoRefreshEnabled ? 'ON' : 'OFF'}
            </Button>
          </div>
        </div>

        {/* Map & List Layout */}
        <div className="grid lg:grid-cols-[400px_1fr] gap-6">
          {/* Location List */}
          <div className="order-2 lg:order-1">
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {isLocationsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredLocations.length > 0 ? (
                filteredLocations.map((location) => (
                  <LocationCard
                    key={location.id}
                    location={location}
                    isSelected={selectedLocation?.id === location.id}
                    onSelect={() => handleLocationSelect(location)}
                    userLocation={userLocation}
                    isRouteSelected={selectedRouteIds.has(location.id)}
                    onRouteToggle={handleRouteToggle}
                    onRequestLocation={handleLocateMe}
                    routeColorIndex={getRouteColorIndex(location.id)}
                    rating={ratingsMap[location.id]}
                    photo={photosMap[location.id] || null}
                    nearbyLocations={filteredLocations.filter(l => l.id !== location.id).slice(0, 5)}
                    isMapLoaded={isMapLoaded}
                    onAmenityFilter={handleAmenityFilter}
                    activeAmenityFilter={amenityFilter}
                    isVisited={viewedIds.has(location.id)}
                  />
                ))
              ) : (
                <div className="text-center py-12">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-1">No locations found</h3>
                  <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
                </div>
              )}
            </div>
          </div>

          {/* Map */}
          <div className="order-1 lg:order-2 h-[400px] lg:h-[600px] rounded-xl overflow-hidden border border-border">
            {apiKeyError ? (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <div className="text-center p-8">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Map Unavailable</h3>
                  <p className="text-sm text-muted-foreground mb-4">{apiKeyError}</p>
                  <p className="text-xs text-muted-foreground">
                    Showing {filteredLocations.length} locations in list view.
                  </p>
                </div>
              </div>
            ) : isApiKeyLoading || !apiKey ? (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <GoogleMapView
                apiKey={apiKey}
                locations={filteredLocations}
                selectedLocation={selectedLocation}
                onMarkerClick={handleMarkerClick}
                onInfoWindowClose={() => setSelectedLocation(null)}
                onMapLoad={onMapLoad}
                userLocation={userLocation}
                routeLocations={routeLocations}
                onLoadStateChange={setIsMapLoaded}
                searchRadiusMiles={useMyLocation ? filters.radius : undefined}
                locationsFoundCount={filteredLocations.length}
              />
            )}
          </div>
        </div>

        {/* Recently Viewed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-8"
        >
          <RecentlyViewed onSelectLocation={handleLocationSelect} />
        </motion.div>

        {/* AI-Powered Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-8"
        >
          <StoreRecommendations limit={6} />
        </motion.div>
      </div>
    </div>
  );
}
