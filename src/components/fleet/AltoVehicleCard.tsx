import { X, Zap, Package, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { AltoRiskScoreBadge } from "./AltoRiskScoreBadge";
import type { AltoVehicle, AltoRoute } from "@/types/alto";

interface Props {
  vehicle: AltoVehicle;
  route: AltoRoute | null;
  onClose: () => void;
}

const STATUS_DOT: Record<AltoVehicle["status"], string> = {
  en_route: "bg-blue-500",
  idle: "bg-gray-400",
  charging: "bg-amber-500",
  offline: "bg-gray-300",
};

export function AltoVehicleCard({ vehicle, route, onClose }: Props) {
  const shortId = route?.id?.slice(0, 8) ?? "—";
  const destLabel = route?.destination_address
    ? route.destination_address.length > 20
      ? route.destination_address.slice(0, 20) + "…"
      : route.destination_address
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.18 }}
      className="absolute top-4 left-4 z-20 bg-white border border-gray-200 shadow-md rounded-xl p-3 w-64 text-xs"
    >
      {/* header row */}
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex-1 min-w-0 mr-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="font-mono text-[10px] text-gray-400 leading-none shrink-0">
              {route ? `R-${shortId}` : "NO ROUTE"}
            </p>
            {route?.risk_score != null && (
              <AltoRiskScoreBadge score={route.risk_score} size="sm" showLabel={false} />
            )}
          </div>
          {destLabel && (
            <p className="font-medium text-gray-800 text-[11px] truncate">{destLabel}</p>
          )}
        </div>
        <button onClick={onClose} className="shrink-0 text-gray-400 hover:text-gray-600">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* route timing */}
      {route && (
        <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-2">
          {route.sla_probability_pct != null && (
            <span className={route.sla_probability_pct >= 80 ? "text-green-600" : "text-amber-600"}>
              {route.sla_probability_pct >= 80 ? "On time" : "At risk"}
            </span>
          )}
          {route.total_distance_km && (
            <span>{Math.round(route.total_distance_km)} km</span>
          )}
          {route.estimated_energy_kwh && (
            <span>{route.estimated_energy_kwh.toFixed(1)} kWh</span>
          )}
        </div>
      )}

      <hr className="border-gray-100 mb-2" />

      {/* vehicle row */}
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${STATUS_DOT[vehicle.status]}`} />
        <span className="font-medium text-gray-700 truncate">{vehicle.name}</span>
        <span className="ml-auto flex items-center gap-1 text-gray-500 shrink-0">
          <Zap className="h-3 w-3 text-amber-500" />
          {Math.round(vehicle.current_soc_pct)}%
        </span>
        {vehicle.payload_kg != null && (
          <span className="flex items-center gap-0.5 text-gray-400 shrink-0">
            <Package className="h-3 w-3" />
            {vehicle.payload_kg}kg
          </span>
        )}
      </div>

      {/* origin / destination */}
      {route && (
        <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-gray-400">
          <div className="flex items-center gap-1 truncate">
            <MapPin className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{route.origin_address ?? "Origin"}</span>
          </div>
          <div className="flex items-center gap-1 truncate justify-end">
            <span className="truncate">{route.destination_address ?? "Dest"}</span>
            <MapPin className="h-2.5 w-2.5 shrink-0 text-blue-500" />
          </div>
        </div>
      )}
    </motion.div>
  );
}
