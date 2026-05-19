import { MapPin, Zap, Clock } from "lucide-react";
import type { AltoChargingStop } from "@/types/alto";

interface Props {
  stops: AltoChargingStop[];
  originLabel?: string;
  destinationLabel?: string;
}

export function AltoChargingStopList({ stops, originLabel = "Origin", destinationLabel = "Destination" }: Props) {
  if (stops.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic">
        No charging stops required for this route.
      </div>
    );
  }

  return (
    <ol className="relative border-l border-muted-foreground/30 ml-2 space-y-4">
      <li className="ml-4">
        <div className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
        <p className="text-sm font-medium">{originLabel}</p>
      </li>

      {stops.map((stop, i) => (
        <li key={stop.station_id || i} className="ml-4">
          <div className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-blue-500 border-2 border-background" />
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium flex items-center gap-1">
              <Zap className="h-3 w-3 text-blue-500" />
              {stop.name || `Charging Stop ${i + 1}`}
            </p>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
              </span>
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {stop.planned_kwh.toFixed(1)} kWh
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                ~{stop.queue_min} min
              </span>
              {stop.max_kw && <span>{stop.max_kw} kW</span>}
            </div>
            {stop.connector_type && (
              <span className="text-xs text-muted-foreground">{stop.connector_type}</span>
            )}
          </div>
        </li>
      ))}

      <li className="ml-4">
        <div className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-red-500 border-2 border-background" />
        <p className="text-sm font-medium">{destinationLabel}</p>
      </li>
    </ol>
  );
}
