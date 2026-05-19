import { useMemo } from "react";
import { OverlayView } from "@react-google-maps/api";
import { motion } from "framer-motion";
import type { AltoVehicle } from "@/types/alto";

const STATUS_COLOR: Record<AltoVehicle["status"], string> = {
  en_route: "#1D4ED8",
  idle: "#6B7280",
  charging: "#D97706",
  offline: "#D1D5DB",
};

const SOC_COLOR = (soc: number) =>
  soc >= 60 ? "#22C55E" : soc >= 30 ? "#F59E0B" : "#EF4444";

function SocRingIcon({
  soc,
  status,
  selected,
}: {
  soc: number;
  status: AltoVehicle["status"];
  selected: boolean;
}) {
  // use a larger viewBox so the selected ring has room without clipping
  const size = selected ? 48 : 36;
  const cx = size / 2;
  const cy = size / 2;
  const r = 16;
  const circumference = 2 * Math.PI * r;
  const dash = (soc / 100) * circumference;
  const ringColor = STATUS_COLOR[status];
  const socColor = SOC_COLOR(soc);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} overflow="visible">
      {/* selected outer ring — rendered inside SVG so no DOM overflow */}
      {selected && (
        <circle
          cx={cx} cy={cy} r={r + 7}
          fill="none"
          stroke="#3B82F6"
          strokeWidth={2}
          opacity={0.8}
        />
      )}
      {/* status ring background */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={ringColor} strokeWidth={2} opacity={0.3} />
      {/* SOC arc */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={socColor}
        strokeWidth={2.5}
        strokeDasharray={`${dash} ${circumference - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      {/* center dark circle */}
      <circle cx={cx} cy={cy} r={11} fill="#1e293b" />
      {/* truck body */}
      <rect x={cx - 7} y={cy - 4} width={9} height={6} rx={1} fill="white" />
      <rect x={cx + 2} y={cy - 2} width={4} height={4} rx={0.5} fill="white" />
      {/* wheels */}
      <circle cx={cx - 4.5} cy={cy + 3} r={1.5} fill="#1e293b" stroke="white" strokeWidth={0.8} />
      <circle cx={cx + 3}   cy={cy + 3} r={1.5} fill="#1e293b" stroke="white" strokeWidth={0.8} />
    </svg>
  );
}

interface Props {
  vehicle: AltoVehicle;
  selected: boolean;
  onClick: () => void;
}

export function AltoVehicleMarker({ vehicle, selected, onClick }: Props) {
  const position = useMemo(
    () => ({ lat: vehicle.current_lat ?? 0, lng: vehicle.current_lng ?? 0 }),
    [vehicle.current_lat, vehicle.current_lng]
  );

  if (!vehicle.current_lat || !vehicle.current_lng) return null;

  // center offset: half of the SVG size
  const size = selected ? 48 : 36;
  const offset = -(size / 2);

  return (
    <OverlayView position={position} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
      <div
        onClick={onClick}
        className="cursor-pointer"
        style={{ transform: `translate(${offset}px, ${offset}px)` }}
        title={`${vehicle.name} — ${Math.round(vehicle.current_soc_pct)}% SOC`}
      >
        {vehicle.status === "en_route" ? (
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <SocRingIcon soc={vehicle.current_soc_pct} status={vehicle.status} selected={selected} />
          </motion.div>
        ) : (
          <SocRingIcon soc={vehicle.current_soc_pct} status={vehicle.status} selected={selected} />
        )}
      </div>
    </OverlayView>
  );
}
