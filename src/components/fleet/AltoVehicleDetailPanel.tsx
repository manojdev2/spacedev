import { X, RefreshCw, Zap, ParkingCircle, Navigation, Crosshair } from "lucide-react";
import { motion } from "framer-motion";
import { AltoRiskScoreBadge } from "./AltoRiskScoreBadge";
import type { AltoVehicle, AltoRoute } from "@/types/alto";

const STATUS_DOT: Record<AltoVehicle["status"], string> = {
  en_route: "bg-blue-500",
  idle: "bg-gray-400",
  charging: "bg-amber-500",
  offline: "bg-gray-300",
};

const STATUS_LABEL: Record<AltoVehicle["status"], string> = {
  en_route: "En Route",
  idle: "Idle",
  charging: "Charging",
  offline: "Offline",
};

interface Props {
  vehicle: AltoVehicle;
  routes: AltoRoute[];
  onClose: () => void;
}

function ActionBtn({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <button className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-[10px] text-gray-500 min-w-[48px]">
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  );
}

function KVRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-[11px] font-medium text-gray-700 font-mono">{value}</span>
    </div>
  );
}

export function AltoVehicleDetailPanel({ vehicle, routes, onClose }: Props) {
  const socColor =
    vehicle.current_soc_pct >= 60 ? "text-green-600" : vehicle.current_soc_pct >= 30 ? "text-amber-600" : "text-red-600";

  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="absolute top-0 right-0 bottom-0 w-80 bg-white border-l border-gray-200 shadow-xl z-20 flex flex-col overflow-hidden"
    >
      {/* header */}
      <div className="flex items-start justify-between p-4 pb-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`h-2 w-2 rounded-full ${STATUS_DOT[vehicle.status]}`} />
            <span className="font-semibold text-sm text-gray-900">{vehicle.name}</span>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <span className="text-[10px] text-gray-400">{vehicle.model}</span>
            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">In Fleet</span>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-0.5">
          <X className="h-4 w-4" />
        </button>
      </div>

      <hr className="border-gray-100" />

      {/* action buttons */}
      <div className="flex items-center gap-2 px-4 py-3">
        <ActionBtn icon={RefreshCw} label="Manual" />
        <ActionBtn icon={Zap} label="Charge" />
        <ActionBtn icon={ParkingCircle} label="Park" />
        <ActionBtn icon={Navigation} label="Follow" />
        <ActionBtn icon={Crosshair} label="Locate" />
      </div>

      <hr className="border-gray-100" />

      {/* stats */}
      <div className="grid grid-cols-3 gap-0 px-4 py-3">
        <div className="text-center">
          <p className={`text-base font-bold ${socColor}`}>{Math.round(vehicle.current_soc_pct)}%</p>
          <p className="text-[9px] text-gray-400 uppercase tracking-wide mt-0.5">SOC</p>
        </div>
        <div className="text-center border-x border-gray-100">
          <p className="text-base font-bold text-gray-800">{STATUS_LABEL[vehicle.status]}</p>
          <p className="text-[9px] text-gray-400 uppercase tracking-wide mt-0.5">Mode</p>
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-gray-800">
            {vehicle.payload_kg != null ? `${vehicle.payload_kg}kg` : "—"}
          </p>
          <p className="text-[9px] text-gray-400 uppercase tracking-wide mt-0.5">Load</p>
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* key-value table */}
      <div className="px-4 py-2">
        {vehicle.current_lat != null && vehicle.current_lng != null && (
          <KVRow
            label="Position"
            value={`${vehicle.current_lat.toFixed(4)}, ${vehicle.current_lng.toFixed(4)}`}
          />
        )}
        <KVRow label="VDA Serial" value={vehicle.id.slice(0, 11)} />
        <KVRow label="Battery" value={`${vehicle.battery_capacity_kwh} kWh`} />
        <KVRow label="Range" value={`${vehicle.max_range_km} km`} />
        <KVRow label="Degradation" value={`${Math.round(vehicle.degradation_factor * 100)}%`} />
        <KVRow label="Vendor" value="Alto" />
      </div>

      <hr className="border-gray-100" />

      {/* related orders */}
      <div className="flex-1 overflow-y-auto">
        <p className="px-4 pt-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          Related Orders
        </p>
        {routes.length === 0 ? (
          <p className="px-4 text-xs text-gray-400">No active routes</p>
        ) : (
          <div className="px-4 space-y-2 pb-4">
            {routes.map((route) => (
              <div key={route.id} className="rounded-lg border border-gray-100 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-gray-500">R-{route.id.slice(0, 8)}</span>
                  <div className="flex items-center gap-1.5">
                    {route.risk_score != null && <AltoRiskScoreBadge score={route.risk_score} size="sm" />}
                    {route.sla_probability_pct != null && (
                      <span className={`text-[9px] ${route.sla_probability_pct >= 80 ? "text-green-600" : "text-amber-600"}`}>
                        {Math.round(route.sla_probability_pct)}% SLA
                      </span>
                    )}
                  </div>
                </div>
                {/* timeline */}
                <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                  <span className="truncate max-w-[90px]">{route.origin_address ?? "Origin"}</span>
                  <div className="flex-1 flex items-center gap-0.5">
                    <div className="h-px flex-1 bg-gray-200" />
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>
                  <span className="truncate max-w-[90px] text-right">{route.destination_address ?? "Dest"}</span>
                </div>
                {(route.total_distance_km || route.estimated_energy_kwh) && (
                  <div className="flex gap-2 text-[9px] text-gray-400">
                    {route.total_distance_km && <span>{Math.round(route.total_distance_km)} km</span>}
                    {route.estimated_energy_kwh && <span>{route.estimated_energy_kwh.toFixed(1)} kWh</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
