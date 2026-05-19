import { useState, useEffect, useCallback, useRef } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  isLoading: boolean;
}

interface UseGeolocationOptions {
  /** Enable continuous watching of position (default: false) */
  watch?: boolean;
  /** Minimum distance change in meters to trigger update (default: 100) */
  distanceThreshold?: number;
}

/**
 * Calculate distance between two coordinates in meters using Haversine formula
 */
function getDistanceInMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const { watch = false, distanceThreshold = 100 } = options;
  
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    isLoading: false,
  });

  const watchIdRef = useRef<number | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);

  const handlePosition = useCallback((position: GeolocationPosition) => {
    const newLat = position.coords.latitude;
    const newLng = position.coords.longitude;
    
    // Check if position changed significantly (beyond threshold)
    if (lastPositionRef.current) {
      const distance = getDistanceInMeters(
        lastPositionRef.current.lat,
        lastPositionRef.current.lng,
        newLat,
        newLng
      );
      
      // Only update if distance exceeds threshold
      if (distance < distanceThreshold) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }
    }
    
    lastPositionRef.current = { lat: newLat, lng: newLng };
    
    setState({
      latitude: newLat,
      longitude: newLng,
      error: null,
      isLoading: false,
    });
  }, [distanceThreshold]);

  const handleError = useCallback((error: GeolocationPositionError) => {
    let errorMessage = 'Unable to retrieve your location';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location permission denied';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information unavailable';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timed out';
        break;
    }
    setState(prev => ({
      ...prev,
      error: errorMessage,
      isLoading: false,
    }));
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by your browser',
        isLoading: false,
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      handlePosition,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes cache
      }
    );
  }, [handlePosition, handleError]);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by your browser',
        isLoading: false,
      }));
      return;
    }

    if (watchIdRef.current !== null) return; // Already watching

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000, // 30 seconds cache for watch mode
      }
    );
  }, [handlePosition, handleError]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Auto-start watching if watch option is true
  useEffect(() => {
    if (watch && state.latitude !== null) {
      startWatching();
    }
    
    return () => {
      stopWatching();
    };
  }, [watch, state.latitude, startWatching, stopWatching]);

  return {
    ...state,
    requestLocation,
    startWatching,
    stopWatching,
    isWatching: watchIdRef.current !== null,
    hasLocation: state.latitude !== null && state.longitude !== null,
  };
}
