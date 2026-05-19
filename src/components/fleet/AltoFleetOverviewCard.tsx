import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Zap, MapPin, WifiOff } from "lucide-react";
import type { AltoVehicle } from "@/types/alto";

interface Props {
  vehicles: AltoVehicle[];
}

export function AltoFleetOverviewCard({ vehicles }: Props) {
  const counts = {
    total: vehicles.length,
    en_route: vehicles.filter((v) => v.status === "en_route").length,
    charging: vehicles.filter((v) => v.status === "charging").length,
    idle: vehicles.filter((v) => v.status === "idle").length,
    offline: vehicles.filter((v) => v.status === "offline").length,
  };

  const avgSoc = vehicles.length
    ? Math.round(vehicles.reduce((s, v) => s + v.current_soc_pct, 0) / vehicles.length)
    : 0;

  const stats = [
    { label: "En Route", value: counts.en_route, icon: Truck, color: "text-blue-600" },
    { label: "Charging", value: counts.charging, icon: Zap, color: "text-yellow-600" },
    { label: "Idle", value: counts.idle, icon: MapPin, color: "text-green-600" },
    { label: "Offline", value: counts.offline, icon: WifiOff, color: "text-muted-foreground" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">Fleet Overview</CardTitle>
        <div className="text-2xl font-bold">{counts.total} Vehicles · Avg {avgSoc}% SOC</div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <Icon className={`h-5 w-5 ${color}`} />
              <span className="text-xl font-bold">{value}</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
