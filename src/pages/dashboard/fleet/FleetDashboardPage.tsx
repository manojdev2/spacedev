import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserOrganization } from "@/hooks/useUserOrganization";
import { AltoFleetOverviewCard } from "@/components/fleet/AltoFleetOverviewCard";
import { AltoSLATracker } from "@/components/fleet/AltoSLATracker";
import { AltoRiskScoreBadge } from "@/components/fleet/AltoRiskScoreBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { AltoVehicle, AltoRoute } from "@/types/alto";

export default function FleetDashboardPage() {
  const { organizationId } = useUserOrganization();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: vehicles = [] } = useQuery<AltoVehicle[]>({
    queryKey: ["alto_vehicles", organizationId],
    enabled: !!organizationId,
    queryFn: async (): Promise<AltoVehicle[]> => {
      const { data, error } = await db
        .from("alto_vehicles")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AltoVehicle[];
    },
  });

  const { data: routes = [] } = useQuery<AltoRoute[]>({
    queryKey: ["alto_routes", organizationId],
    enabled: !!organizationId,
    queryFn: async (): Promise<AltoRoute[]> => {
      const { data, error } = await db
        .from("alto_routes")
        .select("*")
        .eq("organization_id", organizationId)
        .in("status", ["planned", "active"])
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as AltoRoute[];
    },
  });

  const statusColor: Record<AltoVehicle["status"], string> = {
    idle: "secondary",
    en_route: "default",
    charging: "outline",
    offline: "destructive",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fleet Dashboard</h1>
          <p className="text-muted-foreground">Alto AI Routing Intelligence — real-time EV fleet overview</p>
        </div>
        <Button asChild>
          <Link to="/dashboard/fleet/routes">Plan Route</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AltoFleetOverviewCard vehicles={vehicles} />
        <AltoSLATracker routes={routes} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground flex items-center justify-between">
            <span>Vehicle Status</span>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard/fleet/vehicles">Manage →</Link>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vehicles.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <Truck className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">No vehicles added yet.</p>
              <Button asChild>
                <Link to="/dashboard/fleet/vehicles">Add Vehicle</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {vehicles.map((v) => (
                <div key={v.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{v.name}</p>
                    <p className="text-xs text-muted-foreground">{v.model} · {v.battery_capacity_kwh} kWh</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{Math.round(v.current_soc_pct)}% SOC</span>
                    <Badge variant={statusColor[v.status] as "default" | "secondary" | "outline" | "destructive"}>
                      {v.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {routes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center justify-between">
              <span>Active Routes</span>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/dashboard/fleet/routes">View All →</Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {routes.slice(0, 5).map((route) => (
              <div key={route.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">
                    {route.origin_address ?? `${route.origin_lat.toFixed(3)},${route.origin_lng.toFixed(3)}`}
                    {" → "}
                    {route.destination_address ?? `${route.destination_lat.toFixed(3)},${route.destination_lng.toFixed(3)}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {route.total_distance_km ? `${Math.round(route.total_distance_km)} km` : "—"}
                    {route.estimated_energy_kwh ? ` · ${route.estimated_energy_kwh.toFixed(1)} kWh` : ""}
                  </p>
                </div>
                {route.risk_score != null && <AltoRiskScoreBadge score={route.risk_score} size="sm" />}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
