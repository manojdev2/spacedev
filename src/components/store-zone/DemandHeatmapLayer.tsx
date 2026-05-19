import { useEffect, useRef } from 'react';
import { DemandPoint } from '@/hooks/useStoreZoneDemand';

interface DemandHeatmapLayerProps {
  map: google.maps.Map | null;
  demandPoints: DemandPoint[];
  visible: boolean;
  radius?: number;
  opacity?: number;
  gradient?: string[];
}

export function DemandHeatmapLayer({
  map,
  demandPoints,
  visible,
  radius = 30,
  opacity = 0.7,
  gradient,
}: DemandHeatmapLayerProps) {
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);

  useEffect(() => {
    if (!map || !window.google?.maps?.visualization) return;

    // Create or update heatmap layer
    if (!heatmapRef.current) {
      heatmapRef.current = new google.maps.visualization.HeatmapLayer({
        map: visible ? map : null,
        radius,
        opacity,
      });
    }

    // Convert demand points to weighted locations
    const heatmapData = demandPoints.map(point => ({
      location: new google.maps.LatLng(point.lat, point.lng),
      weight: point.demand_weight,
    }));

    heatmapRef.current.setData(heatmapData);
    heatmapRef.current.setMap(visible ? map : null);
    heatmapRef.current.set('radius', radius);
    heatmapRef.current.set('opacity', opacity);

    if (gradient) {
      heatmapRef.current.set('gradient', gradient);
    }

    return () => {
      if (heatmapRef.current) {
        heatmapRef.current.setMap(null);
      }
    };
  }, [map, demandPoints, visible, radius, opacity, gradient]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (heatmapRef.current) {
        heatmapRef.current.setMap(null);
        heatmapRef.current = null;
      }
    };
  }, []);

  return null;
}

// Default gradient for demand heatmap (yellow -> orange -> red -> purple)
export const DEMAND_HEATMAP_GRADIENT = [
  'rgba(0, 255, 255, 0)',
  'rgba(0, 255, 255, 1)',
  'rgba(0, 191, 255, 1)',
  'rgba(0, 127, 255, 1)',
  'rgba(0, 63, 255, 1)',
  'rgba(0, 0, 255, 1)',
  'rgba(0, 0, 223, 1)',
  'rgba(0, 0, 191, 1)',
  'rgba(0, 0, 127, 1)',
  'rgba(63, 0, 91, 1)',
  'rgba(127, 0, 63, 1)',
  'rgba(191, 0, 31, 1)',
  'rgba(255, 0, 0, 1)',
];

// Warm gradient (yellow -> orange -> red)
export const WARM_HEATMAP_GRADIENT = [
  'rgba(255, 255, 0, 0)',
  'rgba(255, 255, 0, 0.5)',
  'rgba(255, 200, 0, 0.7)',
  'rgba(255, 150, 0, 0.8)',
  'rgba(255, 100, 0, 0.9)',
  'rgba(255, 50, 0, 1)',
  'rgba(255, 0, 0, 1)',
  'rgba(200, 0, 0, 1)',
];
