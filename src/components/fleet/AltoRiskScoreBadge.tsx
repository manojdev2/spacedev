import { cn } from "@/lib/utils";

interface Props {
  score: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

function getRiskLevel(score: number) {
  if (score <= 25) return { label: "Low", className: "bg-green-100 text-green-800 border-green-200" };
  if (score <= 50) return { label: "Medium", className: "bg-yellow-100 text-yellow-800 border-yellow-200" };
  if (score <= 74) return { label: "High", className: "bg-orange-100 text-orange-800 border-orange-200" };
  return { label: "Critical", className: "bg-red-100 text-red-800 border-red-200" };
}

export function AltoRiskScoreBadge({ score, showLabel = true, size = "md" }: Props) {
  const { label, className } = getRiskLevel(score);
  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : size === "lg" ? "text-base px-4 py-1.5" : "text-sm px-3 py-1";

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border font-semibold", sizeClass, className)}>
      <span className="font-bold">{Math.round(score)}</span>
      {showLabel && <span className="font-normal">/ 100 · {label}</span>}
    </span>
  );
}
