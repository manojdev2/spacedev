import { useEffect, useRef } from "react";
import { useGoogleMap } from "@react-google-maps/api";
import { useGoogleMaps } from "@/contexts/GoogleMapsContext";
import type { AltoRoute } from "@/types/alto";

interface Props {
  routes: AltoRoute[];
}

// Google encoded polyline decoder — no geometry library required
function decodePolyline(encoded: string): google.maps.LatLngLiteral[] {
  const points: google.maps.LatLngLiteral[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

async function fetchRoutePath(
  apiKey: string,
  origin: google.maps.LatLngLiteral,
  destination: google.maps.LatLngLiteral,
  intermediates: google.maps.LatLngLiteral[]
): Promise<google.maps.LatLngLiteral[]> {
  const body = {
    origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
    destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
    computeAlternativeRoutes: false,
    ...(intermediates.length > 0 && {
      intermediates: intermediates.map((p) => ({
        location: { latLng: { latitude: p.lat, longitude: p.lng } },
      })),
    }),
  };

  const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "routes.polyline.encodedPolyline",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Routes API ${res.status}`);
  const data = await res.json();
  const encoded: string = data?.routes?.[0]?.polyline?.encodedPolyline;
  if (!encoded) throw new Error("No polyline in response");
  return decodePolyline(encoded);
}

export function AltoRouteLayer({ routes }: Props) {
  const map = useGoogleMap();
  const { apiKey } = useGoogleMaps();
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const dotsRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    if (!map || !apiKey) return;

    // clear previous overlays
    polylinesRef.current.forEach((p) => p.setMap(null));
    dotsRef.current.forEach((m) => m.setMap(null));
    polylinesRef.current = [];
    dotsRef.current = [];

    routes.forEach((route) => {
      if (!route.origin_lat || !route.origin_lng || !route.destination_lat || !route.destination_lng) return;

      const origin = { lat: route.origin_lat, lng: route.origin_lng };
      const destination = { lat: route.destination_lat, lng: route.destination_lng };
      const intermediates = (route.charging_stops ?? [])
        .filter((s) => s.lat && s.lng)
        .map((s) => ({ lat: s.lat, lng: s.lng }));

      fetchRoutePath(apiKey, origin, destination, intermediates)
        .then((path) => {
          const polyline = new google.maps.Polyline({
            path,
            strokeColor: "#000000",
            strokeWeight: 0,
            strokeOpacity: 0,
            icons: [
              {
                icon: {
                  path: "M 0,-1 0,1",
                  strokeOpacity: 1,
                  strokeColor: "#000000",
                  strokeWeight: 2.5,
                  scale: 4,
                },
                offset: "0",
                repeat: "16px",
              },
            ],
            map,
          });
          polylinesRef.current.push(polyline);

          // endpoint dots
          [origin, destination].forEach((point, idx) => {
            const dot = new google.maps.Marker({
              position: point,
              map,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 5,
                fillColor: "#ffffff",
                fillOpacity: 1,
                strokeColor: "#000000",
                strokeWeight: idx === 0 ? 2 : 2.5,
              },
            });
            dotsRef.current.push(dot);
          });
        })
        .catch((err) => console.warn("Routes API:", err));
    });

    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
      dotsRef.current.forEach((m) => m.setMap(null));
    };
  }, [map, apiKey, routes]);

  return null;
}
