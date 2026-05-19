import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AltoVehicle } from "@/types/alto";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  model: z.string().min(1, "Model is required"),
  battery_capacity_kwh: z.coerce.number().positive("Must be positive"),
  max_range_km: z.coerce.number().positive("Must be positive"),
  current_soc_pct: z.coerce.number().min(0).max(100),
  degradation_factor: z.coerce.number().min(0.1).max(1.0),
  payload_kg: z.coerce.number().min(0),
  status: z.enum(["idle", "en_route", "charging", "offline"]),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  initial?: Partial<AltoVehicle>;
  onSubmit: (values: FormValues) => void;
  isLoading?: boolean;
}

export function AltoVehicleForm({ initial, onSubmit, isLoading }: Props) {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? "",
      model: initial?.model ?? "",
      battery_capacity_kwh: initial?.battery_capacity_kwh ?? 75,
      max_range_km: initial?.max_range_km ?? 400,
      current_soc_pct: initial?.current_soc_pct ?? 80,
      degradation_factor: initial?.degradation_factor ?? 1.0,
      payload_kg: initial?.payload_kg ?? 0,
      status: initial?.status ?? "idle",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="name">Vehicle Name</Label>
          <Input id="name" placeholder="Truck 01" {...register("name")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="model">Model</Label>
          <Input id="model" placeholder="Rivian R1T" {...register("model")} />
          {errors.model && <p className="text-xs text-destructive">{errors.model.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="battery_capacity_kwh">Battery Capacity (kWh)</Label>
          <Input id="battery_capacity_kwh" type="number" step="0.1" {...register("battery_capacity_kwh")} />
          {errors.battery_capacity_kwh && <p className="text-xs text-destructive">{errors.battery_capacity_kwh.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="max_range_km">Max Range (km)</Label>
          <Input id="max_range_km" type="number" {...register("max_range_km")} />
          {errors.max_range_km && <p className="text-xs text-destructive">{errors.max_range_km.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label htmlFor="current_soc_pct">Current SOC (%)</Label>
          <Input id="current_soc_pct" type="number" min={0} max={100} {...register("current_soc_pct")} />
          {errors.current_soc_pct && <p className="text-xs text-destructive">{errors.current_soc_pct.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="degradation_factor">Degradation Factor</Label>
          <Input id="degradation_factor" type="number" step="0.01" min={0.1} max={1.0} {...register("degradation_factor")} />
          {errors.degradation_factor && <p className="text-xs text-destructive">{errors.degradation_factor.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="payload_kg">Current Payload (kg)</Label>
          <Input id="payload_kg" type="number" min={0} {...register("payload_kg")} />
          {errors.payload_kg && <p className="text-xs text-destructive">{errors.payload_kg.message}</p>}
        </div>
      </div>

      <div className="space-y-1">
        <Label>Status</Label>
        <Select
          defaultValue={initial?.status ?? "idle"}
          onValueChange={(v) => setValue("status", v as FormValues["status"])}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="idle">Idle</SelectItem>
            <SelectItem value="en_route">En Route</SelectItem>
            <SelectItem value="charging">Charging</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Saving..." : initial?.id ? "Update Vehicle" : "Add Vehicle"}
      </Button>
    </form>
  );
}
