import type { AltoVehicle } from "@/types/alto";

interface Props {
  vehicles: AltoVehicle[];
}

export function AltoMapStatusBar({ vehicles }: Props) {
  const total = vehicles.length;
  const active = vehicles.filter((v) => v.status === "en_route").length;
  const charging = vehicles.filter((v) => v.status === "charging").length;
  const avgSoc = total > 0
    ? Math.round(vehicles.reduce((sum, v) => sum + v.current_soc_pct, 0) / total)
    : 0;

  const stat = (label: string, value: string | number) => (
    <span>
      <span className="text-gray-400">{label}: </span>
      <span className="font-medium text-gray-600">{value}</span>
    </span>
  );

  return (
    <div className="flex items-center gap-4 bg-white border-t border-gray-100 h-8 px-4 text-xs shrink-0 z-10">
      {stat("TOTAL VEHICLES", total)}
      <span className="text-gray-200">|</span>
      {stat("ACTIVE", active)}
      <span className="text-gray-200">|</span>
      {stat("AVG SOC", `${avgSoc}%`)}
      <span className="text-gray-200">|</span>
      {stat("CHARGING", charging)}
    </div>
  );
}
