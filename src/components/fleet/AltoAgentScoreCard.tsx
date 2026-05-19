import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scores: Record<string, any>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2 py-1 border-b last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function AgentCard({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{icon} {title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">{children}</CardContent>
    </Card>
  );
}

export function AltoAgentScoreCard({ scores }: Props) {
  // normalise: accept both "energy" and "energy_agent" key styles
  const get = (key: string) => scores[key] ?? scores[`${key}_agent`] ?? null;

  const energy = get("energy");
  const charger = get("charger");
  const sla = get("sla");
  const traffic = get("traffic");
  const risk = get("risk");
  const fleet = get("fleet_coordination");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

      {energy && (
        <AgentCard icon="⚡" title="Energy Agent">
          <Row label="Total consumption" value={`${Number(energy.total_kwh ?? 0).toFixed(1)} kWh`} />
          <Row label="SOC at destination" value={`${Math.round(energy.soc_at_destination_pct ?? 0)}%`} />
          <Row label="Range remaining" value={`${Math.round(energy.range_remaining_km ?? 0)} km`} />
          {energy.efficiency_kwh_per_km != null && (
            <Row label="Efficiency" value={`${Number(energy.efficiency_kwh_per_km).toFixed(3)} kWh/km`} />
          )}
          {Array.isArray(energy.key_factors) && energy.key_factors.length > 0 && (
            <p className="pt-1 text-xs text-muted-foreground">{energy.key_factors[0]}</p>
          )}
        </AgentCard>
      )}

      {charger && (
        <AgentCard icon="🔌" title="Charger Agent">
          <Row
            label="Charging required"
            value={
              charger.charging_required != null
                ? charger.charging_required ? "Yes" : "No"
                : (charger.stops_needed ?? 0) > 0 ? "Yes" : "No"
            }
          />
          <Row
            label="Stops"
            value={String(
              charger.stops_needed ??
              charger.recommended_stops?.length ??
              charger.stops?.length ?? 0
            )}
          />
          {charger.total_charging_time_min != null && (
            <Row label="Charge time" value={`${charger.total_charging_time_min} min`} />
          )}
          {(charger.recommendation ?? charger.notes) && (
            <p className="pt-1 text-xs text-muted-foreground line-clamp-3">
              {charger.recommendation ?? charger.notes}
            </p>
          )}
        </AgentCard>
      )}

      {sla && (
        <AgentCard icon="📅" title="SLA Agent">
          <Row
            label="On-time probability"
            value={`${Math.round(sla.on_time_probability_pct ?? 0)}%`}
          />
          {sla.estimated_arrival_iso && (
            <Row
              label="Est. arrival"
              value={new Date(sla.estimated_arrival_iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            />
          )}
          {sla.estimated_arrival_min != null && (
            <Row label="Travel time" value={`${sla.estimated_arrival_min} min`} />
          )}
          <Row
            label="Delay"
            value={
              (sla.delay_minutes ?? 0) > 0 ? `+${sla.delay_minutes} min` : "None"
            }
          />
          {sla.recommendation && (
            <p className="pt-1 text-xs text-muted-foreground line-clamp-3">{sla.recommendation}</p>
          )}
        </AgentCard>
      )}

      {traffic && (
        <AgentCard icon="🚦" title="Traffic Agent">
          <Row
            label="Delay"
            value={`${traffic.current_delay_minutes ?? traffic.delay_min ?? 0} min`}
          />
          <Row
            label="Congestion"
            value={traffic.traffic_density ?? traffic.congestion_level ?? "—"}
          />
          {traffic.best_departure_offset_min != null && (
            <Row
              label="Best departure offset"
              value={traffic.best_departure_offset_min > 0 ? `+${traffic.best_departure_offset_min} min` : "Now"}
            />
          )}
          {traffic.recommendation && (
            <p className="pt-1 text-xs text-muted-foreground line-clamp-3">{traffic.recommendation}</p>
          )}
        </AgentCard>
      )}

      {risk && (
        <AgentCard icon="⚠️" title="Risk Agent">
          <Row
            label="Composite score"
            value={`${Math.round(risk.composite_score ?? 0)} / 100`}
          />
          <Row label="Level" value={risk.risk_level ?? "—"} />
          <Row
            label="Range anxiety"
            value={String(Math.round(
              risk.range_anxiety_score ?? risk.component_scores?.range_anxiety ?? 0
            ))}
          />
          <Row
            label="Charger availability"
            value={String(Math.round(
              risk.charger_availability_score ?? risk.component_scores?.charger_availability ?? 0
            ))}
          />
          {Array.isArray(risk.mitigation_actions ?? risk.mitigation_suggestions) && (
            <p className="pt-1 text-xs text-muted-foreground line-clamp-2">
              {(risk.mitigation_actions ?? risk.mitigation_suggestions)?.[0]}
            </p>
          )}
        </AgentCard>
      )}

      {fleet && (
        <AgentCard icon="🚛" title="Fleet Agent">
          <Row
            label="Conflicts"
            value={String(
              fleet.charger_conflicts?.length ??
              fleet.conflicts?.length ?? 0
            )}
          />
          <Row
            label="Swarm risk"
            value={fleet.swarm_risk_level ?? "—"}
          />
          <Row
            label="Departure offset"
            value={
              (fleet.recommended_departure_offset_min ?? 0) > 0
                ? `+${fleet.recommended_departure_offset_min} min`
                : "None"
            }
          />
          {(fleet.coordination_notes ?? fleet.recommendation) && (
            <p className="pt-1 text-xs text-muted-foreground line-clamp-3">
              {fleet.coordination_notes ?? fleet.recommendation}
            </p>
          )}
        </AgentCard>
      )}

    </div>
  );
}
