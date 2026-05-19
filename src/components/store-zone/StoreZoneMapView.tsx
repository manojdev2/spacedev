import { useCallback, useEffect, useRef } from 'react';
import { GoogleMap, Polygon, Circle, DrawingManager, Marker } from '@react-google-maps/api';
import { StoreZone } from '@/hooks/useStoreZones';
import { StoreZoneFormData } from './StoreZoneForm';
import { DemandPoint } from '@/hooks/useStoreZoneDemand';
import { WARM_HEATMAP_GRADIENT } from './DemandHeatmapLayer';
import { HypotheticalLocation } from './WhatIfSimulation';

const mapContainerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: 40.7128, lng: -74.0060 };

interface StoreZoneMapViewProps {
  storeZones: StoreZone[];
  selectedStoreZone: StoreZone | null;
  onSelectStoreZone: (zone: StoreZone) => void;
  formData: StoreZoneFormData | null;
  isDrawing: boolean;
  isFormOpen: boolean;
  onMapClick: (lat: number, lng: number) => void;
  onPolygonComplete: (coordinates: { lat: number; lng: number }[]) => void;
  onMapLoad: (map: google.maps.Map) => void;
  demandPoints?: DemandPoint[];
  showHeatmap?: boolean;
  heatmapRadius?: number;
  heatmapOpacity?: number;
  hypotheticalLocations?: HypotheticalLocation[];
}

export function StoreZoneMapView({
  storeZones, selectedStoreZone, onSelectStoreZone, formData, isDrawing, isFormOpen,
  onMapClick, onPolygonComplete, onMapLoad,
  demandPoints = [], showHeatmap = false, heatmapRadius = 30, heatmapOpacity = 0.7, hypotheticalLocations = [],
}: StoreZoneMapViewProps) {
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const handlePolygonComplete = useCallback((polygon: google.maps.Polygon) => {
    const path = polygon.getPath();
    const coordinates: { lat: number; lng: number }[] = [];
    for (let i = 0; i < path.getLength(); i++) {
      const point = path.getAt(i);
      coordinates.push({ lat: point.lat(), lng: point.lng() });
    }
    polygon.setMap(null);
    onPolygonComplete(coordinates);
  }, [onPolygonComplete]);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) onMapClick(e.latLng.lat(), e.latLng.lng());
  }, [onMapClick]);

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    onMapLoad(map);
  }, [onMapLoad]);

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps?.visualization) return;
    if (showHeatmap && demandPoints.length > 0) {
      const heatmapData = demandPoints.map(p => ({ location: new google.maps.LatLng(p.lat, p.lng), weight: p.demand_weight }));
      if (!heatmapRef.current) {
        heatmapRef.current = new google.maps.visualization.HeatmapLayer({ data: heatmapData, map: mapRef.current, radius: heatmapRadius, opacity: heatmapOpacity, gradient: WARM_HEATMAP_GRADIENT });
      } else {
        heatmapRef.current.setData(heatmapData);
        heatmapRef.current.setMap(mapRef.current);
        heatmapRef.current.set('radius', heatmapRadius);
        heatmapRef.current.set('opacity', heatmapOpacity);
      }
    } else if (heatmapRef.current) {
      heatmapRef.current.setMap(null);
    }
  }, [demandPoints, showHeatmap, heatmapRadius, heatmapOpacity]);

  useEffect(() => { return () => { if (heatmapRef.current) { heatmapRef.current.setMap(null); heatmapRef.current = null; } }; }, []);

  return (
    <GoogleMap mapContainerStyle={mapContainerStyle} center={defaultCenter} zoom={11} onLoad={handleMapLoad} onClick={handleMapClick}
      options={{ styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }], mapTypeControl: true, streetViewControl: false, fullscreenControl: true }}>
      {isDrawing && formData?.territory_type === 'polygon' && (
        <DrawingManager onPolygonComplete={handlePolygonComplete} options={{
          drawingControl: true, drawingControlOptions: { position: google.maps.ControlPosition.TOP_CENTER, drawingModes: [google.maps.drawing.OverlayType.POLYGON] },
          polygonOptions: { fillColor: formData.color, fillOpacity: 0.3, strokeColor: formData.color, strokeWeight: 2, editable: true },
        }} />
      )}
      {storeZones.map((zone) => {
        if (zone.territory_type === 'radius' && zone.center_lat && zone.center_lng) {
          return <Circle key={zone.id} center={{ lat: zone.center_lat, lng: zone.center_lng }} radius={(zone.radius_miles || 5) * 1609.34}
            options={{ fillColor: zone.color, fillOpacity: selectedStoreZone?.id === zone.id ? 0.4 : 0.2, strokeColor: zone.color, strokeWeight: selectedStoreZone?.id === zone.id ? 3 : 2, clickable: true }}
            onClick={() => onSelectStoreZone(zone)} />;
        }
        if (zone.territory_type === 'polygon' && zone.polygon_coordinates) {
          return <Polygon key={zone.id} paths={zone.polygon_coordinates as { lat: number; lng: number }[]}
            options={{ fillColor: zone.color, fillOpacity: selectedStoreZone?.id === zone.id ? 0.4 : 0.2, strokeColor: zone.color, strokeWeight: selectedStoreZone?.id === zone.id ? 3 : 2, clickable: true }}
            onClick={() => onSelectStoreZone(zone)} />;
        }
        return null;
      })}
      {isFormOpen && formData?.territory_type === 'radius' && formData.center_lat && formData.center_lng && (
        <Circle center={{ lat: formData.center_lat, lng: formData.center_lng }} radius={formData.radius_miles * 1609.34}
          options={{ fillColor: formData.color, fillOpacity: 0.3, strokeColor: formData.color, strokeWeight: 2, strokeOpacity: 0.8 }} />
      )}
      {hypotheticalLocations.map((loc) => (
        <Circle key={loc.id} center={{ lat: loc.lat, lng: loc.lng }} radius={loc.radius_miles * 1609.34}
          options={{ fillColor: '#10b981', fillOpacity: 0.25, strokeColor: '#10b981', strokeWeight: 2, strokeOpacity: 0.8, strokePosition: google.maps.StrokePosition.OUTSIDE }} />
      ))}
      {hypotheticalLocations.map((loc) => (
        <Marker key={`marker-${loc.id}`} position={{ lat: loc.lat, lng: loc.lng }}
          icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#10b981', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 3 }} title={loc.name} />
      ))}
    </GoogleMap>
  );
}
