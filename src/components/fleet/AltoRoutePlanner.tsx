import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddressAutocomplete } from "@/components/admin/AddressAutocomplete";
import { useGoogleMaps } from "@/contexts/GoogleMapsContext";
import type { AltoVehicle, AltoRouteOptimizeRequest } from "@/types/alto";

const schema = z.object({
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
  const { isLoaded } = useGoogleMaps();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [origin, setOrigin] = useState({ address: "", lat: 0, lng: 0 });
  const [destination, setDestination] = useState({ address: "", lat: 0, lng: 0 });
  const [originError, setOriginError] = useState("");
  const [destError, setDestError] = useState("");

  const { handleSubmit, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { driving_behavior: "normal", ac_on: false },
  });

  const acOn = watch("ac_on");

  const onSubmit = (values: FormValues) => {
    let valid = true;
    if (!origin.lat || !origin.lng) { setOriginError("Select an origin address"); valid = false; }
    else setOriginError("");
    if (!destination.lat || !destination.lng) { setDestError("Select a destination address"); valid = false; }
    else setDestError("");
    if (!selectedVehicleId || !valid) return;

    onOptimize({
      vehicle_id: selectedVehicleId,
      origin: { lat: origin.lat, lng: origin.lng, address: origin.address },
      destination: { lat: destination.lat, lng: destination.lng, address: destination.address },
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
                    {v.name} — {Math.round(v.current_soc_pct)}% SOC · {v.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>From</Label>
            <AddressAutocomplete
              value={origin.address}
              onChange={(val) => setOrigin((p) => ({ ...p, address: val, lat: 0, lng: 0 }))}
              onPlaceSelect={(details) => {
                setOrigin({ address: details.formattedAddress, lat: details.lat, lng: details.lng });
                setOriginError("");
              }}
              placeholder="Search origin address..."
              isMapLoaded={isLoaded}
            />
            {originError && <p className="text-xs text-destructive">{originError}</p>}
          </div>

          <div className="space-y-1">
            <Label>To</Label>
            <AddressAutocomplete
              value={destination.address}
              onChange={(val) => setDestination((p) => ({ ...p, address: val, lat: 0, lng: 0 }))}
              onPlaceSelect={(details) => {
                setDestination({ address: details.formattedAddress, lat: details.lat, lng: details.lng });
                setDestError("");
              }}
              placeholder="Search destination address..."
              isMapLoaded={isLoaded}
            />
            {destError && <p className="text-xs text-destructive">{destError}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Driving Style</Label>
              <Select
                defaultValue="normal"
                onValueChange={(v) => setValue("driving_behavior", v as FormValues["driving_behavior"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="eco">Eco (−15% energy)</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="aggressive">Aggressive (+20%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2 pb-1">
              <Switch checked={acOn} onCheckedChange={(v) => setValue("ac_on", v)} />
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
