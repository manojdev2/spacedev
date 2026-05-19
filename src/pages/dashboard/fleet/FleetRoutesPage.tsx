import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserOrganization } from "@/hooks/useUserOrganization";
import { useAltoRouteOptimize } from "@/hooks/useAltoRouteOptimize";
import { AltoRoutePlanner } from "@/components/fleet/AltoRoutePlanner";
import { AltoAgentScoreCard } from "@/components/fleet/AltoAgentScoreCard";
import { AltoRiskScoreBadge } from "@/components/fleet/AltoRiskScoreBadge";
import { AltoChargingStopList } from "@/components/fleet/AltoChargingStopList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronUp, RefreshCw, Trash2, Map } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { AltoVehicle, AltoRoute } from "@/types/alto";

export default function FleetRoutesPage() {
  const { organizationId } = useUserOrganization();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const optimizeMutation = useAltoRouteOptimize();
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
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
        .order("name");
      if (error) throw error;
      return (data ?? []) as AltoVehicle[];
    },
  });

  const { data: routes = [] } = useQuery<AltoRoute[]>({
    queryKey: ["alto_routes_all", organizationId],
    enabled: !!organizationId,
    queryFn: async (): Promise<AltoRoute[]> => {
      const { data, error } = await db
        .from("alto_routes")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as AltoRoute[];
    },
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const { error } = await db.from("alto_routes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["alto_routes_all"] });
      if (selectedRouteId === id) setSelectedRouteId(null);
      toast({ title: "Route deleted" });
    },
    onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
  });

  const handleRerun = (route: AltoRoute) => {
    setSelectedRouteId(null);
    optimizeMutation.mutate(
      {
        vehicle_id: route.vehicle_id,
        origin: { lat: route.origin_lat, lng: route.origin_lng, address: route.origin_address ?? undefined },
        destination: { lat: route.destination_lat, lng: route.destination_lng, address: route.destination_address ?? undefined },
      },
      { onSuccess: () => qc.invalidateQueries({ queryKey: ["alto_routes_all"] }) }
    );
  };

  // Latest optimized takes priority; otherwise show selected history route
  const latestRoute = optimizeMutation.data ?? null;
  const selectedHistoryRoute = routes.find((r) => r.id === selectedRouteId) ?? null;
  const displayRoute = latestRoute ?? selectedHistoryRoute;

  const statusBadge: Record<AltoRoute["status"], "default" | "secondary" | "outline" | "destructive"> = {
    planned: "secondary",
    active: "default",
    completed: "outline",
    cancelled: "destructive",
  };

  const hasAgentScores = (route: AltoRoute) =>
    route.agent_scores && Object.keys(route.agent_scores).length > 0;

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
                onSuccess: () => {
                  qc.invalidateQueries({ queryKey: ["alto_routes_all"] });
                  setSelectedRouteId(null); // show latest result
                },
              })
            }
          />
        </div>

        <div className="lg:col-span-2 space-y-4">
          {displayRoute ? (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span>{latestRoute && !selectedRouteId ? "Latest Optimized Route" : "Route Analysis"}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {displayRoute.origin_address ?? "Origin"} → {displayRoute.destination_address ?? "Destination"}
                      </span>
                    </div>
                    {displayRoute.risk_score != null && (
                      <AltoRiskScoreBadge score={displayRoute.risk_score} />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex gap-4">
                    {displayRoute.total_distance_km ? (
                      <span><strong>{Math.round(displayRoute.total_distance_km)}</strong> km</span>
                    ) : null}
                    {displayRoute.estimated_energy_kwh ? (
                      <span><strong>{displayRoute.estimated_energy_kwh.toFixed(1)}</strong> kWh</span>
                    ) : null}
                    {displayRoute.sla_probability_pct != null && (
                      <span><strong>{Math.round(displayRoute.sla_probability_pct)}%</strong> on-time</span>
                    )}
                  </div>
                  {displayRoute.charging_stops?.length > 0 && (
                    <>
                      <Separator />
                      <AltoChargingStopList
                        stops={displayRoute.charging_stops}
                        originLabel={displayRoute.origin_address ?? "Origin"}
                        destinationLabel={displayRoute.destination_address ?? "Destination"}
                      />
                    </>
                  )}
                </CardContent>
              </Card>

              {hasAgentScores(displayRoute) && (
                <div>
                  <h2 className="text-base font-semibold mb-3">Agent Analysis</h2>
                  <AltoAgentScoreCard scores={displayRoute.agent_scores as Record<string, unknown>} />
                </div>
              )}

              {!hasAgentScores(displayRoute) && (
                <Card className="py-8 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">No agent analysis available for this route.</p>
                </Card>
              )}
            </>
          ) : (
            <Card className="h-64 flex items-center justify-center">
              <p className="text-muted-foreground">Plan a route or click a history item to see AI agent analysis.</p>
            </Card>
          )}
        </div>
      </div>

      {routes.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">Route History</h2>
          <div className="space-y-2">
            {routes.map((route) => {
              const isSelected = selectedRouteId === route.id;
              return (
                <div key={route.id} className={`border rounded-lg transition-colors ${isSelected ? "border-primary bg-primary/5" : "hover:border-muted-foreground/30"}`}>
                  <button
                    className="w-full flex items-center justify-between py-3 px-4 text-left"
                    onClick={() => setSelectedRouteId(isSelected ? null : route.id)}
                  >
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
                    <div className="flex items-center gap-2">
                      <Badge variant={statusBadge[route.status]}>{route.status}</Badge>
                      {route.risk_score != null && <AltoRiskScoreBadge score={route.risk_score} size="sm" />}
                      {hasAgentScores(route) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedRouteId(isSelected ? null : route.id); }}
                          title="View agent analysis"
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {isSelected ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate("/dashboard/fleet/map", { state: { vehicleId: route.vehicle_id, routeId: route.id } }); }}
                        title="View on map"
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-blue-500 transition-colors"
                      >
                        <Map className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRerun(route); }}
                        disabled={optimizeMutation.isPending}
                        title="Re-run optimization"
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(route.id); }}
                        disabled={deleteMutation.isPending}
                        title="Delete route"
                        className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
