import { useRef, useEffect } from "react";
import { GoogleMap } from "@react-google-maps/api";
import { AltoVehicleMarker } from "./AltoVehicleMarker";
import { AltoRouteLayer } from "./AltoRouteLayer";
import type { AltoVehicle, AltoRoute } from "@/types/alto";

const ALTO_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry",             stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.text.fill",     stylers: [{ color: "#9ca3af" }] },
  { elementType: "labels.text.stroke",   stylers: [{ color: "#ffffff" }] },
  { featureType: "road",          elementType: "geometry",  stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "geometry",  stylers: [{ color: "#efefef" }] },
  { featureType: "road.highway",  elementType: "geometry",  stylers: [{ color: "#e5e5e5" }] },
  { featureType: "water",         elementType: "geometry",  stylers: [{ color: "#e8eff5" }] },
  { featureType: "poi",                                      stylers: [{ visibility: "off" }] },
  { featureType: "transit",                                  stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#e5e7eb" }] },
];

const MAP_OPTIONS: google.maps.MapOptions = {
  styles: ALTO_MAP_STYLE,
  disableDefaultUI: true,
  zoomControl: false,
  clickableIcons: false,
  gestureHandling: "greedy",
};

const CONTAINER_STYLE = { width: "100%", height: "100%" };
const DEFAULT_CENTER = { lat: 40.7128, lng: -74.006 }; // New York fallback

interface Props {
  vehicles: AltoVehicle[];
  routes: AltoRoute[];
  selectedVehicleId: string | null;
  onVehicleClick: (id: string) => void;
}

export function AltoCommandMap({ vehicles, routes, selectedVehicleId, onVehicleClick }: Props) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const fittedRef = useRef(false);

  const activeRoutes = routes.filter((r) => r.status === "active" || r.status === "planned");

  // Auto-fit to all vehicles with coordinates once data arrives
  useEffect(() => {
    if (fittedRef.current) return;
    if (!mapRef.current) return;

    const positioned = vehicles.filter((v) => v.current_lat && v.current_lng);
    if (positioned.length === 0) return;

    fittedRef.current = true;

    if (positioned.length === 1) {
      mapRef.current.setCenter({ lat: positioned[0].current_lat!, lng: positioned[0].current_lng! });
      mapRef.current.setZoom(14);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    positioned.forEach((v) => bounds.extend({ lat: v.current_lat!, lng: v.current_lng! }));
    mapRef.current.fitBounds(bounds, 80); // 80px padding
  }, [vehicles]);

  return (
    <GoogleMap
      mapContainerStyle={CONTAINER_STYLE}
      defaultCenter={DEFAULT_CENTER}
      defaultZoom={12}
      options={MAP_OPTIONS}
      onLoad={(map) => { mapRef.current = map; }}
    >
      <AltoRouteLayer routes={activeRoutes} />
      {vehicles.map((vehicle) => (
        <AltoVehicleMarker
          key={vehicle.id}
          vehicle={vehicle}
          selected={selectedVehicleId === vehicle.id}
          onClick={() => onVehicleClick(vehicle.id)}
        />
      ))}
    </GoogleMap>
  );
}
