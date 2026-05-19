import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useUserOrganization } from "@/hooks/useUserOrganization";
import { useGoogleMaps } from "@/contexts/GoogleMapsContext";
import { AltoCommandMap } from "@/components/fleet/AltoCommandMap";
import { AltoMapTopBar } from "@/components/fleet/AltoMapTopBar";
import { AltoMapStatusBar } from "@/components/fleet/AltoMapStatusBar";
import { AltoVehicleCard } from "@/components/fleet/AltoVehicleCard";
import { AltoVehicleDetailPanel } from "@/components/fleet/AltoVehicleDetailPanel";
import type { AltoVehicle, AltoRoute } from "@/types/alto";

export default function FleetMapPage() {
  const { organizationId } = useUserOrganization();
  const { isLoaded } = useGoogleMaps();
  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const location = useLocation();
  const navState = (location.state as { vehicleId?: string; routeId?: string } | null) ?? {};
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(navState.vehicleId ?? null);
  const [focusRouteId] = useState<string | null>(navState.routeId ?? null);

  // Clear navigation state so back-navigation doesn't re-select
  useEffect(() => {
    if (location.state) window.history.replaceState({}, "");
  }, [location.state]);

  const { data: vehicles = [] } = useQuery<AltoVehicle[]>({
    queryKey: ["alto_vehicles", organizationId],
    enabled: !!organizationId,
    refetchInterval: 30_000,
    queryFn: async (): Promise<AltoVehicle[]> => {
      const { data, error } = await db
        .from("alto_vehicles")
        .select("*")
        .eq("organization_id", organizationId)
        .order("name");
      if (error) throw error;
      return (data ?? []) as AltoVehicle[];
    },
  });

  const { data: routes = [] } = useQuery<AltoRoute[]>({
    queryKey: ["alto_routes_active", organizationId],
    enabled: !!organizationId,
    refetchInterval: 30_000,
    queryFn: async (): Promise<AltoRoute[]> => {
      const { data, error } = await db
        .from("alto_routes")
        .select("*")
        .eq("organization_id", organizationId)
        .in("status", ["active", "planned"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AltoRoute[];
    },
  });

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? null;
  const selectedRoute = routes.find((r) => r.vehicle_id === selectedVehicleId) ?? null;
  const vehicleRoutes = routes.filter((r) => r.vehicle_id === selectedVehicleId);

  return (
    <div className="flex flex-col h-full -m-4 lg:-m-8">
      <AltoMapTopBar onNewRoute={() => navigate("/dashboard/fleet/routes")} />

      <div className="flex-1 relative overflow-hidden">
        {isLoaded ? (
          <AltoCommandMap
            vehicles={vehicles}
            routes={focusRouteId ? routes.filter((r) => r.id === focusRouteId) : routes}
            selectedVehicleId={selectedVehicleId}
            onVehicleClick={(id) =>
              setSelectedVehicleId((prev) => (prev === id ? null : id))
            }
          />
        ) : (
          <div className="w-full h-full bg-gray-50 flex items-center justify-center">
            <p className="text-sm text-gray-400">Loading map…</p>
          </div>
        )}

        <AnimatePresence>
          {selectedVehicle && (
            <AltoVehicleCard
              key={`card-${selectedVehicle.id}`}
              vehicle={selectedVehicle}
              route={selectedRoute}
              onClose={() => setSelectedVehicleId(null)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedVehicle && (
            <AltoVehicleDetailPanel
              key={`panel-${selectedVehicle.id}`}
              vehicle={selectedVehicle}
              routes={vehicleRoutes}
              onClose={() => setSelectedVehicleId(null)}
            />
          )}
        </AnimatePresence>
      </div>

      <AltoMapStatusBar vehicles={vehicles} />
    </div>
  );
}
