import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { useAltoRouteOptimize } from "@/hooks/useAltoRouteOptimize";
import { AltoRoutePlanner } from "@/components/fleet/AltoRoutePlanner";
import { AltoAgentScoreCard } from "@/components/fleet/AltoAgentScoreCard";
import { AltoRiskScoreBadge } from "@/components/fleet/AltoRiskScoreBadge";
import { AltoChargingStopList } from "@/components/fleet/AltoChargingStopList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { AltoVehicle, AltoRoute } from "@/types/alto";

export default function FleetRoutesPage() {
  const { client } = useAuthStore();
  const qc = useQueryClient();
  const optimizeMutation = useAltoRouteOptimize();

  const { data: vehicles = [] } = useQuery<AltoVehicle[]>({
    queryKey: ["alto_vehicles", client?.organization_id],
    enabled: !!client?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alto_vehicles")
        .select("*")
        .eq("organization_id", client!.organization_id)
        .order("name");
      if (error) throw error;
      return (data ?? []) as AltoVehicle[];
    },
  });

  const { data: routes = [] } = useQuery<AltoRoute[]>({
    queryKey: ["alto_routes_all", client?.organization_id],
    enabled: !!client?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alto_routes")
        .select("*")
        .eq("organization_id", client!.organization_id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as AltoRoute[];
    },
  });

  const lastRoute = optimizeMutation.data ?? null;

  const statusBadge: Record<AltoRoute["status"], "default" | "secondary" | "outline" | "destructive"> = {
    planned: "secondary",
    active: "default",
    completed: "outline",
    cancelled: "destructive",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Route Planner</h1>
        <p className="text-muted-foreground">AI-optimized EV routes with 6-agent risk scoring</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <AltoRoutePlanner
            vehicles={vehicles}
            isLoading={optimizeMutation.isPending}
            onOptimize={(req) =>
              optimizeMutation.mutate(req, {
                onSuccess: () => qc.invalidateQueries({ queryKey: ["alto_routes_all"] }),
              })
            }
          />
        </div>

        <div className="lg:col-span-2 space-y-4">
          {lastRoute && (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>Latest Optimized Route</span>
                    {lastRoute.risk_score != null && (
                      <AltoRiskScoreBadge score={lastRoute.risk_score} />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex gap-4">
                    {lastRoute.total_distance_km && (
                      <span><strong>{Math.round(lastRoute.total_distance_km)}</strong> km</span>
                    )}
                    {lastRoute.estimated_energy_kwh && (
                      <span><strong>{lastRoute.estimated_energy_kwh.toFixed(1)}</strong> kWh</span>
                    )}
                    {lastRoute.sla_probability_pct != null && (
                      <span><strong>{Math.round(lastRoute.sla_probability_pct)}%</strong> on-time</span>
                    )}
                  </div>
                  {lastRoute.charging_stops?.length > 0 && (
                    <>
                      <Separator />
                      <AltoChargingStopList
                        stops={lastRoute.charging_stops}
                        originLabel={lastRoute.origin_address ?? "Origin"}
                        destinationLabel={lastRoute.destination_address ?? "Destination"}
                      />
                    </>
                  )}
                </CardContent>
              </Card>

              {lastRoute.agent_scores && Object.keys(lastRoute.agent_scores).length > 0 && (
                <div>
                  <h2 className="text-base font-semibold mb-3">Agent Analysis</h2>
                  <AltoAgentScoreCard scores={lastRoute.agent_scores} />
                </div>
              )}
            </>
          )}

          {!lastRoute && (
            <Card className="h-64 flex items-center justify-center">
              <p className="text-muted-foreground">Plan a route to see AI agent analysis here.</p>
            </Card>
          )}
        </div>
      </div>

      {routes.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">Route History</h2>
          <div className="space-y-2">
            {routes.map((route) => (
              <div key={route.id} className="flex items-center justify-between py-3 px-4 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">
                    {route.origin_address ?? `${route.origin_lat.toFixed(3)}, ${route.origin_lng.toFixed(3)}`}
                    {" → "}
                    {route.destination_address ?? `${route.destination_lat.toFixed(3)}, ${route.destination_lng.toFixed(3)}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(route.created_at).toLocaleString()}
                    {route.total_distance_km ? ` · ${Math.round(route.total_distance_km)} km` : ""}
                    {route.estimated_energy_kwh ? ` · ${route.estimated_energy_kwh.toFixed(1)} kWh` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={statusBadge[route.status]}>{route.status}</Badge>
                  {route.risk_score != null && <AltoRiskScoreBadge score={route.risk_score} size="sm" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
