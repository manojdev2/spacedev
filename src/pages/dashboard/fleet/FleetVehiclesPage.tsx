import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserOrganization } from "@/hooks/useUserOrganization";
import { toast } from "@/hooks/use-toast";
import { AltoVehicleForm } from "@/components/fleet/AltoVehicleForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Plus, Pencil } from "lucide-react";
import type { AltoVehicle } from "@/types/alto";

type VehicleFormData = Pick<AltoVehicle, "name" | "model" | "battery_capacity_kwh" | "max_range_km" | "current_soc_pct" | "degradation_factor" | "payload_kg" | "status"> & { current_lat?: number | null; current_lng?: number | null };

export default function FleetVehiclesPage() {
  const { organizationId } = useUserOrganization();
  const qc = useQueryClient();
  const [editVehicle, setEditVehicle] = useState<AltoVehicle | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: vehicles = [], isLoading } = useQuery<AltoVehicle[]>({
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

  const addMutation = useMutation<void, Error, VehicleFormData>({
    mutationFn: async (values) => {
      const { error } = await db.from("alto_vehicles").insert({
        ...values,
        organization_id: organizationId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alto_vehicles"] });
      setAddOpen(false);
      toast({ title: "Vehicle added" });
    },
    onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
  });

  const updateMutation = useMutation<void, Error, { id: string; values: Partial<VehicleFormData> }>({
    mutationFn: async ({ id, values }) => {
      const { error } = await db.from("alto_vehicles").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alto_vehicles"] });
      setEditVehicle(null);
      toast({ title: "Vehicle updated" });
    },
    onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const { error } = await db.from("alto_vehicles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alto_vehicles"] });
      toast({ title: "Vehicle removed" });
    },
    onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
  });

  const statusColor: Record<AltoVehicle["status"], "default" | "secondary" | "outline" | "destructive"> = {
    idle: "secondary",
    en_route: "default",
    charging: "outline",
    offline: "destructive",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fleet Vehicles</h1>
          <p className="text-muted-foreground">Manage your EV fleet registry</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Vehicle</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Vehicle</DialogTitle>
            </DialogHeader>
            <AltoVehicleForm
              isLoading={addMutation.isPending}
              onSubmit={(values) => addMutation.mutate(values as VehicleFormData)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading vehicles...</p>
      ) : vehicles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No vehicles yet. Add your first EV to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {vehicles.map((v) => (
            <Card key={v.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{v.name}</span>
                  <Badge variant={statusColor[v.status]}>{v.status}</Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">{v.model}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">Battery</span>
                    <p className="font-medium">{v.battery_capacity_kwh} kWh</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">SOC</span>
                    <p className="font-medium">{Math.round(v.current_soc_pct)}%</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Range</span>
                    <p className="font-medium">{v.max_range_km} km</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Degradation</span>
                    <p className="font-medium">{Math.round(v.degradation_factor * 100)}%</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Dialog open={editVehicle?.id === v.id} onOpenChange={(o) => !o && setEditVehicle(null)}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditVehicle(v)}>
                        <Pencil className="h-3 w-3 mr-1" />Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Edit {v.name}</DialogTitle>
                      </DialogHeader>
                      <AltoVehicleForm
                        initial={v}
                        isLoading={updateMutation.isPending}
                        onSubmit={(values) => updateMutation.mutate({ id: v.id, values })}
                      />
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(v.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
