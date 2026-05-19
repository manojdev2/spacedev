-- Alto AI Routing Intelligence — Fleet Data Model

-- Vehicles
CREATE TABLE IF NOT EXISTS alto_vehicles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  model                 TEXT NOT NULL DEFAULT '',
  battery_capacity_kwh  NUMERIC NOT NULL,
  max_range_km          NUMERIC NOT NULL DEFAULT 400,
  current_soc_pct       NUMERIC NOT NULL DEFAULT 80 CHECK (current_soc_pct >= 0 AND current_soc_pct <= 100),
  current_lat           DOUBLE PRECISION,
  current_lng           DOUBLE PRECISION,
  status                TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle','en_route','charging','offline')),
  degradation_factor    NUMERIC NOT NULL DEFAULT 1.0 CHECK (degradation_factor > 0 AND degradation_factor <= 1.0),
  payload_kg            NUMERIC NOT NULL DEFAULT 0,
  driver_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_seen_at          TIMESTAMP WITH TIME ZONE,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_alto_vehicles_org ON alto_vehicles(organization_id);
CREATE INDEX idx_alto_vehicles_status ON alto_vehicles(organization_id, status);

ALTER TABLE alto_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE alto_vehicles REPLICA IDENTITY FULL;

CREATE POLICY "Org members can view vehicles" ON alto_vehicles
  FOR SELECT USING (user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Admins can insert vehicles" ON alto_vehicles
  FOR INSERT WITH CHECK (user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Admins can update vehicles" ON alto_vehicles
  FOR UPDATE USING (user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Admins can delete vehicles" ON alto_vehicles
  FOR DELETE USING (user_belongs_to_org(auth.uid(), organization_id));

-- Charging Stations
CREATE TABLE IF NOT EXISTS alto_charging_stations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ocm_id                TEXT UNIQUE,
  name                  TEXT NOT NULL,
  lat                   DOUBLE PRECISION NOT NULL,
  lng                   DOUBLE PRECISION NOT NULL,
  address               TEXT,
  connector_types       TEXT[] DEFAULT '{}',
  max_kw                NUMERIC,
  num_chargers          INTEGER DEFAULT 1,
  current_availability  INTEGER DEFAULT 0,
  avg_queue_min         NUMERIC DEFAULT 0,
  last_synced_at        TIMESTAMP WITH TIME ZONE,
  is_active             BOOLEAN DEFAULT true,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_alto_stations_location ON alto_charging_stations(lat, lng);
CREATE INDEX idx_alto_stations_org ON alto_charging_stations(organization_id);

ALTER TABLE alto_charging_stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view charging stations" ON alto_charging_stations
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage charging stations" ON alto_charging_stations
  FOR ALL USING (organization_id IS NULL OR user_belongs_to_org(auth.uid(), organization_id));

-- Routes
CREATE TABLE IF NOT EXISTS alto_routes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vehicle_id              UUID NOT NULL REFERENCES alto_vehicles(id) ON DELETE CASCADE,
  origin_lat              DOUBLE PRECISION NOT NULL,
  origin_lng              DOUBLE PRECISION NOT NULL,
  destination_lat         DOUBLE PRECISION NOT NULL,
  destination_lng         DOUBLE PRECISION NOT NULL,
  origin_address          TEXT,
  destination_address     TEXT,
  waypoints               JSONB DEFAULT '[]',
  status                  TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','active','completed','cancelled')),
  planned_departure_at    TIMESTAMP WITH TIME ZONE,
  actual_departure_at     TIMESTAMP WITH TIME ZONE,
  estimated_arrival_at    TIMESTAMP WITH TIME ZONE,
  actual_arrival_at       TIMESTAMP WITH TIME ZONE,
  total_distance_km       NUMERIC,
  estimated_energy_kwh    NUMERIC,
  actual_energy_kwh       NUMERIC,
  risk_score              NUMERIC CHECK (risk_score >= 0 AND risk_score <= 100),
  sla_probability_pct     NUMERIC CHECK (sla_probability_pct >= 0 AND sla_probability_pct <= 100),
  route_polyline          TEXT,
  agent_scores            JSONB DEFAULT '{}',
  charging_stops          JSONB DEFAULT '[]',
  created_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at              TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at              TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_alto_routes_org ON alto_routes(organization_id);
CREATE INDEX idx_alto_routes_vehicle ON alto_routes(vehicle_id);
CREATE INDEX idx_alto_routes_status ON alto_routes(organization_id, status);

ALTER TABLE alto_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view routes" ON alto_routes
  FOR SELECT USING (user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Org members can insert routes" ON alto_routes
  FOR INSERT WITH CHECK (user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Org members can update routes" ON alto_routes
  FOR UPDATE USING (user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Admins can delete routes" ON alto_routes
  FOR DELETE USING (user_belongs_to_org(auth.uid(), organization_id));

-- Route Telemetry
CREATE TABLE IF NOT EXISTS alto_route_telemetry (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id              UUID NOT NULL REFERENCES alto_routes(id) ON DELETE CASCADE,
  vehicle_id            UUID NOT NULL REFERENCES alto_vehicles(id) ON DELETE CASCADE,
  timestamp             TIMESTAMP WITH TIME ZONE NOT NULL,
  lat                   DOUBLE PRECISION NOT NULL,
  lng                   DOUBLE PRECISION NOT NULL,
  soc_pct               NUMERIC,
  speed_kmh             NUMERIC,
  heading_deg           NUMERIC,
  altitude_m            NUMERIC,
  energy_kwh_consumed   NUMERIC DEFAULT 0,
  event_type            TEXT DEFAULT 'heartbeat' CHECK (event_type IN ('heartbeat','geofence','stop','charging_start','charging_end')),
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_alto_telemetry_route ON alto_route_telemetry(route_id, timestamp DESC);
CREATE INDEX idx_alto_telemetry_vehicle ON alto_route_telemetry(vehicle_id, timestamp DESC);

ALTER TABLE alto_route_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE alto_route_telemetry REPLICA IDENTITY FULL;

CREATE POLICY "Org members can manage telemetry" ON alto_route_telemetry
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM alto_routes r
      WHERE r.id = route_id AND user_belongs_to_org(auth.uid(), r.organization_id)
    )
  );

-- Weather Cache
CREATE TABLE IF NOT EXISTS alto_weather_cache (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grid_lat      NUMERIC NOT NULL,
  grid_lng      NUMERIC NOT NULL,
  fetched_at    TIMESTAMP WITH TIME ZONE NOT NULL,
  temp_celsius  NUMERIC,
  wind_speed_ms NUMERIC,
  precip_mm     NUMERIC,
  condition     TEXT,
  humidity_pct  NUMERIC,
  expires_at    TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(grid_lat, grid_lng)
);

ALTER TABLE alto_weather_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages weather cache" ON alto_weather_cache FOR ALL USING (true);

-- Simulation Scenarios
CREATE TABLE IF NOT EXISTS alto_simulation_scenarios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  vehicle_config  JSONB NOT NULL DEFAULT '{}',
  route_config    JSONB NOT NULL DEFAULT '{}',
  scenario_params JSONB NOT NULL DEFAULT '{}',
  result          JSONB,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_alto_scenarios_org ON alto_simulation_scenarios(organization_id);

ALTER TABLE alto_simulation_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage scenarios" ON alto_simulation_scenarios
  FOR ALL USING (user_belongs_to_org(auth.uid(), organization_id));
