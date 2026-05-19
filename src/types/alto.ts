export type VehicleStatus = "idle" | "en_route" | "charging" | "offline";
export type RouteStatus = "planned" | "active" | "completed" | "cancelled";
export type TelemetryEventType = "heartbeat" | "geofence" | "stop" | "charging_start" | "charging_end";
export type DrivingBehavior = "normal" | "aggressive" | "eco";

export interface AltoVehicle {
  id: string;
  organization_id: string;
  name: string;
  model: string;
  battery_capacity_kwh: number;
  max_range_km: number;
  current_soc_pct: number;
  current_lat: number | null;
  current_lng: number | null;
  status: VehicleStatus;
  degradation_factor: number;
  payload_kg: number;
  driver_id: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AltoChargingStation {
  id: string;
  organization_id: string | null;
  ocm_id: string | null;
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  connector_types: string[];
  max_kw: number | null;
  num_chargers: number;
  current_availability: number;
  avg_queue_min: number;
  last_synced_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AltoWaypoint {
  lat: number;
  lng: number;
  stop_type?: "delivery" | "pickup" | "charging" | "rest";
  address?: string;
}

export interface AltoChargingStop {
  station_id: string;
  lat: number;
  lng: number;
  name?: string;
  planned_kwh: number;
  queue_min: number;
  connector_type?: string;
  max_kw?: number;
}

export interface AltoAgentScores {
  energy?: AltoEnergyResult;
  charger?: AltoChargerResult;
  sla?: AltoSLAResult;
  traffic?: AltoTrafficResult;
  risk?: AltoRiskResult;
  fleet_coordination?: AltoFleetCoordinationResult;
}

export interface AltoEnergyResult {
  base_kwh: number;
  terrain_kwh: number;
  weather_kwh: number;
  payload_kwh: number;
  total_kwh: number;
  range_remaining_km: number;
  soc_at_destination_pct: number;
  efficiency_kwh_per_km: number;
  confidence_pct: number;
  key_factors: string[];
}

export interface AltoChargerResult {
  charging_required: boolean;
  recommended_stops: AltoChargingStop[];
  total_charging_time_min: number;
  total_kwh_to_charge: number;
  confidence_pct: number;
  notes: string;
}

export interface AltoSLAResult {
  estimated_arrival_iso: string;
  on_time_probability_pct: number;
  delay_minutes: number;
  earliest_arrival_iso: string;
  latest_arrival_iso: string;
  primary_delay_reason: string | null;
  confidence_pct: number;
}

export interface AltoTrafficResult {
  current_delay_minutes: number;
  congestion_segments: Array<{ description: string; delay_min: number }>;
  recommended_departure_iso: string;
  traffic_density: "low" | "moderate" | "heavy" | "severe";
  incident_warnings: string[];
  confidence_pct: number;
}

export interface AltoRiskResult {
  composite_score: number;
  range_anxiety_score: number;
  charger_availability_score: number;
  sla_risk_score: number;
  weather_risk_score: number;
  terrain_risk_score: number;
  risk_level: "low" | "medium" | "high" | "critical";
  mitigation_actions: string[];
  confidence_pct: number;
}

export interface AltoFleetCoordinationResult {
  charger_conflicts: Array<{
    station_id: string;
    conflicting_vehicle_id: string;
    conflict_time_iso: string;
    suggested_offset_min: number;
  }>;
  recommended_departure_offset_min: number;
  fleet_efficiency_score: number;
  coordination_notes: string;
  confidence_pct: number;
}

export interface AltoRoute {
  id: string;
  organization_id: string;
  vehicle_id: string;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  origin_address: string | null;
  destination_address: string | null;
  waypoints: AltoWaypoint[];
  status: RouteStatus;
  planned_departure_at: string | null;
  actual_departure_at: string | null;
  estimated_arrival_at: string | null;
  actual_arrival_at: string | null;
  total_distance_km: number | null;
  estimated_energy_kwh: number | null;
  actual_energy_kwh: number | null;
  risk_score: number | null;
  sla_probability_pct: number | null;
  route_polyline: string | null;
  agent_scores: AltoAgentScores;
  charging_stops: AltoChargingStop[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AltoRouteTelemetry {
  id: string;
  route_id: string;
  vehicle_id: string;
  timestamp: string;
  lat: number;
  lng: number;
  soc_pct: number | null;
  speed_kmh: number | null;
  heading_deg: number | null;
  altitude_m: number | null;
  energy_kwh_consumed: number;
  event_type: TelemetryEventType;
  created_at: string;
}

export interface AltoSimulationResult {
  estimated_energy_kwh: number;
  soc_at_destination_pct: number;
  range_remaining_km: number;
  total_distance_km: number;
  charging_stops: AltoChargingStop[];
  sla_probability_pct: number;
  risk_score: number;
  risk_level: AltoRiskResult["risk_level"];
  agent_scores: AltoAgentScores;
  warnings: string[];
}

export interface AltoRouteOptimizeRequest {
  vehicle_id: string;
  origin: { lat: number; lng: number; address?: string };
  destination: { lat: number; lng: number; address?: string };
  waypoints?: AltoWaypoint[];
  planned_departure_at?: string;
  driving_behavior?: DrivingBehavior;
  ac_on?: boolean;
}

export interface AltoEnergyPredictRequest {
  distance_km: number;
  elevation_gain_m?: number;
  elevation_loss_m?: number;
  payload_kg?: number;
  vehicle_capacity_kg?: number;
  temp_celsius?: number;
  wind_speed_ms?: number;
  battery_capacity_kwh: number;
  degradation_factor?: number;
  ac_on?: boolean;
  driving_behavior?: DrivingBehavior;
}
