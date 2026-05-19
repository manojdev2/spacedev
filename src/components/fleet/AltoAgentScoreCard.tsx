import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AltoAgentScores } from "@/types/alto";

interface Props {
  scores: AltoAgentScores;
}

function ConfidenceBadge({ pct }: { pct: number }) {
  const color = pct >= 80 ? "default" : pct >= 60 ? "secondary" : "destructive";
  return <Badge variant={color}>{pct}% conf.</Badge>;
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start justify-between gap-2 py-1 border-b last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className="text-sm font-medium">{value}</span>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}

export function AltoAgentScoreCard({ scores }: Props) {
  const { energy, charger, sla, traffic, risk, fleet_coordination } = scores;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {energy && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>⚡ Energy Agent</span>
              <ConfidenceBadge pct={energy.confidence_pct} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <Row label="Total consumption" value={`${energy.total_kwh.toFixed(1)} kWh`} />
            <Row label="SOC at destination" value={`${Math.round(energy.soc_at_destination_pct)}%`} />
            <Row label="Range remaining" value={`${Math.round(energy.range_remaining_km)} km`} />
            <Row label="Efficiency" value={`${energy.efficiency_kwh_per_km.toFixed(3)} kWh/km`} />
            {energy.key_factors.length > 0 && (
              <div className="pt-1 text-xs text-muted-foreground">{energy.key_factors.join(" · ")}</div>
            )}
          </CardContent>
        </Card>
      )}

      {charger && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>🔌 Charger Agent</span>
              <ConfidenceBadge pct={charger.confidence_pct} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <Row label="Charging required" value={charger.charging_required ? "Yes" : "No"} />
            <Row label="Stops" value={String(charger.recommended_stops.length)} />
            <Row label="Total charge time" value={`${charger.total_charging_time_min} min`} />
            <Row label="Energy to add" value={`${charger.total_kwh_to_charge.toFixed(1)} kWh`} />
            {charger.notes && <div className="pt-1 text-xs text-muted-foreground">{charger.notes}</div>}
          </CardContent>
        </Card>
      )}

      {sla && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>📅 SLA Agent</span>
              <ConfidenceBadge pct={sla.confidence_pct} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <Row label="On-time probability" value={`${Math.round(sla.on_time_probability_pct)}%`} />
            <Row
              label="Est. arrival"
              value={new Date(sla.estimated_arrival_iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            />
            <Row label="Delay" value={sla.delay_minutes > 0 ? `+${sla.delay_minutes} min` : "None"} />
            {sla.primary_delay_reason && (
              <div className="pt-1 text-xs text-muted-foreground">{sla.primary_delay_reason}</div>
            )}
          </CardContent>
        </Card>
      )}

      {traffic && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>🚦 Traffic Agent</span>
              <ConfidenceBadge pct={traffic.confidence_pct} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <Row label="Current delay" value={`${traffic.current_delay_minutes} min`} />
            <Row label="Congestion level" value={traffic.traffic_density} />
            <Row label="Congestion segments" value={String(traffic.congestion_segments.length)} />
            {traffic.incident_warnings.length > 0 && (
              <div className="pt-1 text-xs text-destructive">{traffic.incident_warnings[0]}</div>
            )}
          </CardContent>
        </Card>
      )}

      {risk && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>⚠️ Risk Agent</span>
              <ConfidenceBadge pct={risk.confidence_pct} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <Row label="Composite score" value={`${Math.round(risk.composite_score)} / 100`} />
            <Row label="Range anxiety" value={String(Math.round(risk.range_anxiety_score))} />
            <Row label="Charger availability" value={String(Math.round(risk.charger_availability_score))} />
            <Row label="SLA risk" value={String(Math.round(risk.sla_risk_score))} />
            {risk.mitigation_actions.length > 0 && (
              <div className="pt-1 text-xs text-muted-foreground">{risk.mitigation_actions[0]}</div>
            )}
          </CardContent>
        </Card>
      )}

      {fleet_coordination && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>🚛 Fleet Agent</span>
              <ConfidenceBadge pct={fleet_coordination.confidence_pct} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <Row label="Charger conflicts" value={String(fleet_coordination.charger_conflicts.length)} />
            <Row
              label="Recommended offset"
              value={
                fleet_coordination.recommended_departure_offset_min > 0
                  ? `+${fleet_coordination.recommended_departure_offset_min} min`
                  : "None"
              }
            />
            <Row label="Fleet efficiency" value={`${Math.round(fleet_coordination.fleet_efficiency_score)}%`} />
            {fleet_coordination.coordination_notes && (
              <div className="pt-1 text-xs text-muted-foreground">{fleet_coordination.coordination_notes}</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
