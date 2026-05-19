import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AltoRiskScoreBadge } from "./AltoRiskScoreBadge";
import type { AltoRoute } from "@/types/alto";

interface Props {
  routes: AltoRoute[];
}

export function AltoSLATracker({ routes }: Props) {
  const active = routes.filter((r) => r.status === "active" || r.status === "planned");

  if (active.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">SLA Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No active routes.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">SLA Tracker — {active.length} Active</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {active.slice(0, 5).map((route) => {
          const sla = route.sla_probability_pct ?? 0;
          const risk = route.risk_score ?? 0;
          return (
            <div key={route.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium truncate max-w-[160px]">
                  {route.origin_address ?? "Origin"} → {route.destination_address ?? "Dest."}
                </span>
                <AltoRiskScoreBadge score={risk} showLabel={false} size="sm" />
              </div>
              <div className="flex items-center gap-2">
                <Progress value={sla} className="flex-1 h-1.5" />
                <span className="text-xs text-muted-foreground w-12 text-right">{Math.round(sla)}% on-time</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
