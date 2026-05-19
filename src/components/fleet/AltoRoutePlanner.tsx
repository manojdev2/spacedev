import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AltoVehicle, AltoRouteOptimizeRequest } from "@/types/alto";

const schema = z.object({
  origin_lat: z.coerce.number(),
  origin_lng: z.coerce.number(),
  origin_address: z.string().optional(),
  destination_lat: z.coerce.number(),
  destination_lng: z.coerce.number(),
  destination_address: z.string().optional(),
  driving_behavior: z.enum(["normal", "aggressive", "eco"]),
  ac_on: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  vehicles: AltoVehicle[];
  isLoading?: boolean;
  onOptimize: (request: AltoRouteOptimizeRequest) => void;
}

export function AltoRoutePlanner({ vehicles, isLoading, onOptimize }: Props) {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      driving_behavior: "normal",
      ac_on: false,
      origin_address: "",
      destination_address: "",
    },
  });

  const acOn = watch("ac_on");

  const onSubmit = (values: FormValues) => {
    if (!selectedVehicleId) return;
    onOptimize({
      vehicle_id: selectedVehicleId,
      origin: { lat: values.origin_lat, lng: values.origin_lng, address: values.origin_address },
      destination: { lat: values.destination_lat, lng: values.destination_lng, address: values.destination_address },
      driving_behavior: values.driving_behavior,
      ac_on: values.ac_on,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Plan Route</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Vehicle</Label>
            <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select vehicle..." />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name} — {v.current_soc_pct}% SOC · {v.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Origin</Label>
            <Input placeholder="Address (optional)" {...register("origin_address")} />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" step="any" placeholder="Latitude" {...register("origin_lat")} />
              <Input type="number" step="any" placeholder="Longitude" {...register("origin_lng")} />
            </div>
            {(errors.origin_lat || errors.origin_lng) && (
              <p className="text-xs text-destructive">Valid lat/lng required</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Destination</Label>
            <Input placeholder="Address (optional)" {...register("destination_address")} />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" step="any" placeholder="Latitude" {...register("destination_lat")} />
              <Input type="number" step="any" placeholder="Longitude" {...register("destination_lng")} />
            </div>
            {(errors.destination_lat || errors.destination_lng) && (
              <p className="text-xs text-destructive">Valid lat/lng required</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Driving Style</Label>
              <Select
                defaultValue="normal"
                onValueChange={(v) => setValue("driving_behavior", v as FormValues["driving_behavior"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eco">Eco (-15% energy)</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="aggressive">Aggressive (+20% energy)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2 pb-1">
              <Switch
                checked={acOn}
                onCheckedChange={(v) => setValue("ac_on", v)}
              />
              <Label>A/C On</Label>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || !selectedVehicleId}>
            {isLoading ? "Optimizing..." : "Optimize Route"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
