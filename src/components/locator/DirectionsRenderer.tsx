import { useEffect, useState, useCallback } from 'react';
import { DirectionsRenderer as GoogleDirectionsRenderer } from '@react-google-maps/api';
import { Location } from '@/types';

// Define distinct colors for up to 8 routes
const ROUTE_COLORS = [
  '#6366F1', // indigo
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
];

interface DirectionsRendererProps {
  origin: { lat: number; lng: number };
  destinations: Location[];
  travelMode?: google.maps.TravelMode;
}

interface RouteResult {
  locationId: string;
  directions: google.maps.DirectionsResult;
  colorIndex: number;
}

export function DirectionsRenderer({ 
  origin, 
  destinations,
  travelMode = google.maps.TravelMode.DRIVING
}: DirectionsRendererProps) {
  const [routes, setRoutes] = useState<RouteResult[]>([]);

  const fetchDirections = useCallback(async () => {
    if (!origin || destinations.length === 0) {
      setRoutes([]);
      return;
    }

    const directionsService = new google.maps.DirectionsService();
    const newRoutes: RouteResult[] = [];

    for (let i = 0; i < destinations.length; i++) {
      const destination = destinations[i];
      
      try {
        const result = await directionsService.route({
          origin,
          destination: { lat: destination.lat, lng: destination.lng },
          travelMode,
        });

        newRoutes.push({
          locationId: destination.id,
          directions: result,
          colorIndex: i % ROUTE_COLORS.length,
        });
      } catch (error) {
        console.error(`Failed to fetch directions for ${destination.name}:`, error);
      }
    }

    setRoutes(newRoutes);
  }, [origin, destinations, travelMode]);

  useEffect(() => {
    fetchDirections();
  }, [fetchDirections]);

  return (
    <>
      {routes.map((route) => (
        <GoogleDirectionsRenderer
          key={route.locationId}
          directions={route.directions}
          options={{
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: ROUTE_COLORS[route.colorIndex],
              strokeWeight: 5,
              strokeOpacity: 0.8,
            },
            preserveViewport: true,
          }}
        />
      ))}
    </>
  );
}

export { ROUTE_COLORS };
