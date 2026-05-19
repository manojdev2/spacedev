import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callGemini, corsHeaders } from "../_shared/callGemini.ts";

const MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY") || "";
const WEATHER_API_KEY = Deno.env.get("WEATHER_API_KEY") || "";
const WEATHER_API_URL = Deno.env.get("WEATHER_API_URL") || "http://api.weatherapi.com/v1";

async function fetchWeather(lat: number, lng: number): Promise<Record<string, unknown>> {
  try {
    if (!WEATHER_API_KEY) return { temp_celsius: 20, wind_speed_ms: 0, precip_mm: 0, condition: "unknown" };
    const res = await fetch(`${WEATHER_API_URL}/current.json?key=${WEATHER_API_KEY}&q=${lat},${lng}`);
    if (!res.ok) return { temp_celsius: 20, wind_speed_ms: 0, precip_mm: 0, condition: "unknown" };
    const d = await res.json();
    return {
      temp_celsius: d.current?.temp_c ?? 20,
      wind_speed_ms: ((d.current?.wind_kph ?? 0) / 3.6),
      precip_mm: d.current?.precip_mm ?? 0,
      condition: d.current?.condition?.text ?? "unknown",
      humidity_pct: d.current?.humidity ?? 50,
    };
  } catch {
    return { temp_celsius: 20, wind_speed_ms: 0, precip_mm: 0, condition: "unknown" };
  }
}

async function fetchElevation(lat: number, lng: number): Promise<number> {
  try {
    if (!MAPS_API_KEY) return 0;
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/elevation/json?locations=${lat},${lng}&key=${MAPS_API_KEY}`
    );
    const d = await res.json();
    return d.results?.[0]?.elevation ?? 0;
  } catch {
    return 0;
  }
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchDirections(
  originLat: number, originLng: number,
  destLat: number, destLng: number
): Promise<{ distance_km: number; duration_min: number; polyline: string }> {
  // Haversine fallback used when no API key or if Routes API fails
  const fallback = () => {
    const distance_km = haversineKm(originLat, originLng, destLat, destLng);
    return { distance_km, duration_min: distance_km * 1.5, polyline: "" };
  };

  if (!MAPS_API_KEY) return fallback();

  try {
    const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": MAPS_API_KEY,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: originLat, longitude: originLng } } },
        destination: { location: { latLng: { latitude: destLat, longitude: destLng } } },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        computeAlternativeRoutes: false,
      }),
    });

    if (!res.ok) return fallback();
    const d = await res.json();
    const route = d.routes?.[0];
    if (!route) return fallback();

    const distance_km = (route.distanceMeters ?? 0) / 1000;
    // duration comes back as e.g. "1523s"
    const durationStr: string = route.duration ?? "0s";
    const duration_min = parseInt(durationStr.replace("s", ""), 10) / 60;

    return {
      distance_km,
      duration_min,
      polyline: route.polyline?.encodedPolyline ?? "",
    };
  } catch {
    return fallback();
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: userRole } = await supabase.from("user_roles").select("organization_id").eq("user_id", user.id).single();
    if (!userRole) return new Response(JSON.stringify({ error: "No organization" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const orgId = userRole.organization_id;
    const body = await req.json();
    const { vehicle_id, origin, destination, constraints = {} } = body;

    if (!vehicle_id || origin?.lat == null || origin?.lng == null || destination?.lat == null || destination?.lng == null) {
      return new Response(JSON.stringify({ error: "vehicle_id, origin, and destination are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch vehicle
    const { data: vehicle, error: vErr } = await supabase.from("alto_vehicles").select("*").eq("id", vehicle_id).eq("organization_id", orgId).single();
    if (vErr || !vehicle) return new Response(JSON.stringify({ error: "Vehicle not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // 2. Fetch route data from Google Maps
    const [routeData, originElev, destElev, weather] = await Promise.all([
      fetchDirections(origin.lat, origin.lng, destination.lat, destination.lng),
      fetchElevation(origin.lat, origin.lng),
      fetchElevation(destination.lat, destination.lng),
      fetchWeather((origin.lat + destination.lat) / 2, (origin.lng + destination.lng) / 2),
    ]);

    const elevationGain = Math.max(0, (destElev as number) - (originElev as number));
    const elevationLoss = Math.max(0, (originElev as number) - (destElev as number));

    // 3. Fetch nearby charging stations
    const latRange = 1.5;
    const lngRange = 1.5;
    const { data: chargers } = await supabase.from("alto_charging_stations")
      .select("id, name, lat, lng, max_kw, num_chargers, current_availability, avg_queue_min, connector_types")
      .eq("is_active", true)
      .gte("lat", Math.min(origin.lat, destination.lat) - latRange)
      .lte("lat", Math.max(origin.lat, destination.lat) + latRange)
      .gte("lng", Math.min(origin.lng, destination.lng) - lngRange)
      .lte("lng", Math.max(origin.lng, destination.lng) + lngRange)
      .limit(20);

    // 4. Fetch other active vehicles for swarm coordination
    const { data: activeVehicles } = await supabase.from("alto_vehicles")
      .select("id, name, current_lat, current_lng, current_soc_pct, status")
      .eq("organization_id", orgId)
      .eq("status", "en_route")
      .neq("id", vehicle_id);

    // 5. Build Gemini context and run 6-agent analysis
    const systemPrompt = `You are the Alto Routing Intelligence Engine — a multi-agent AI for EV fleet operations.
You will receive vehicle state, route data, weather, elevation, charger availability, and fleet positions.
You MUST call ALL six agent tools with precise quantitative analysis.
Think like a fleet operator, energy strategist, logistics planner, and predictive AI simultaneously.`;

    const userPrompt = `Optimize this EV fleet route with full intelligence analysis:

VEHICLE:
- Name: ${vehicle.name} (${vehicle.model})
- Battery: ${vehicle.battery_capacity_kwh} kWh | SOC: ${vehicle.current_soc_pct}%
- Degradation factor: ${vehicle.degradation_factor} | Payload: ${vehicle.payload_kg} kg
- Max range: ${vehicle.max_range_km} km

ROUTE:
- Distance: ${routeData.distance_km.toFixed(1)} km
- Drive time (with traffic): ${routeData.duration_min.toFixed(0)} min
- Elevation: gain ${elevationGain.toFixed(0)} m / loss ${elevationLoss.toFixed(0)} m
- Deadline: ${constraints.deadline_iso || "none"}

WEATHER:
- Temp: ${weather.temp_celsius}°C | Wind: ${weather.wind_speed_ms} m/s
- Precipitation: ${weather.precip_mm} mm | Condition: ${weather.condition}

CHARGING STATIONS ALONG ROUTE (${(chargers || []).length} found):
${(chargers || []).slice(0, 10).map((c: Record<string, unknown>) =>
  `- ${c.name} | ${c.max_kw || '?'} kW | ${c.current_availability}/${c.num_chargers} available | ~${c.avg_queue_min} min queue`
).join("\n") || "No stations found nearby"}

OTHER ACTIVE FLEET VEHICLES (${(activeVehicles || []).length}):
${(activeVehicles || []).map((v: Record<string, unknown>) => `- ${v.name} | SOC: ${v.current_soc_pct}% | at ${v.current_lat},${v.current_lng}`).join("\n") || "None active"}

Run all six agent analyses now.`;

    const res = await callGemini(GEMINI_API_KEY, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tool_choice: "auto",
      tools: [
        {
          type: "function",
          function: {
            name: "energy_agent",
            description: "Predict EV energy consumption for this route",
            parameters: {
              type: "object",
              properties: {
                base_kwh: { type: "number" },
                terrain_kwh: { type: "number" },
                weather_kwh: { type: "number" },
                payload_kwh: { type: "number" },
                total_kwh: { type: "number" },
                soc_at_destination_pct: { type: "number" },
                range_remaining_km: { type: "number" },
                key_factors: { type: "array", items: { type: "string" } },
              },
              required: ["total_kwh", "soc_at_destination_pct", "range_remaining_km", "key_factors"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "charger_agent",
            description: "Recommend optimal charging stops along the route",
            parameters: {
              type: "object",
              properties: {
                stops_needed: { type: "number" },
                stops: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      station_name: { type: "string" },
                      arrive_soc_pct: { type: "number" },
                      target_soc_pct: { type: "number" },
                      charge_kwh: { type: "number" },
                      est_charge_min: { type: "number" },
                      queue_risk: { type: "string", enum: ["low", "medium", "high"] },
                    },
                  },
                },
                recommendation: { type: "string" },
              },
              required: ["stops_needed", "stops", "recommendation"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "sla_agent",
            description: "Assess on-time delivery probability",
            parameters: {
              type: "object",
              properties: {
                on_time_probability_pct: { type: "number" },
                estimated_arrival_min: { type: "number" },
                buffer_min: { type: "number" },
                risk_factors: { type: "array", items: { type: "string" } },
                recommendation: { type: "string" },
              },
              required: ["on_time_probability_pct", "estimated_arrival_min", "risk_factors", "recommendation"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "traffic_agent",
            description: "Analyze traffic conditions and delays",
            parameters: {
              type: "object",
              properties: {
                delay_min: { type: "number" },
                congestion_level: { type: "string", enum: ["low", "moderate", "high", "severe"] },
                best_departure_offset_min: { type: "number" },
                alternative_route_available: { type: "boolean" },
                recommendation: { type: "string" },
              },
              required: ["delay_min", "congestion_level", "recommendation"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "risk_agent",
            description: "Compute composite route risk score 0-100",
            parameters: {
              type: "object",
              properties: {
                composite_score: { type: "number", description: "0=no risk, 100=do not dispatch" },
                component_scores: {
                  type: "object",
                  properties: {
                    range_anxiety: { type: "number" },
                    charger_availability: { type: "number" },
                    sla_risk: { type: "number" },
                    weather_risk: { type: "number" },
                    terrain_risk: { type: "number" },
                  },
                },
                risk_level: { type: "string", enum: ["low", "moderate", "high", "critical"] },
                critical_risks: { type: "array", items: { type: "string" } },
                mitigation_suggestions: { type: "array", items: { type: "string" } },
              },
              required: ["composite_score", "risk_level", "critical_risks", "mitigation_suggestions"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "fleet_coordination_agent",
            description: "Detect swarm conflicts and optimize fleet-wide dispatch",
            parameters: {
              type: "object",
              properties: {
                conflicts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      conflict_type: { type: "string" },
                      description: { type: "string" },
                      resolution: { type: "string" },
                    },
                  },
                },
                recommended_departure_offset_min: { type: "number" },
                swarm_risk_level: { type: "string", enum: ["none", "low", "medium", "high"] },
                recommendation: { type: "string" },
              },
              required: ["conflicts", "swarm_risk_level", "recommendation"],
            },
          },
        },
      ],
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini error ${res.status}: ${err}`);
    }

    const aiData = await res.json();
    const toolCalls = aiData.choices?.[0]?.message?.tool_calls || [];

    const agentScores: Record<string, unknown> = {};
    for (const tc of toolCalls) {
      try {
        agentScores[tc.function.name] = JSON.parse(tc.function.arguments);
      } catch { /* skip malformed */ }
    }

    const riskAgent = agentScores.risk_agent as Record<string, unknown> | undefined;
    const energyAgent = agentScores.energy_agent as Record<string, unknown> | undefined;
    const slaAgent = agentScores.sla_agent as Record<string, unknown> | undefined;
    const chargerAgent = agentScores.charger_agent as Record<string, unknown> | undefined;

    // Persist route to database
    const estimatedArrivalAt = new Date(Date.now() + (routeData.duration_min * 60 * 1000) + ((chargerAgent?.stops as unknown[])?.length || 0) * 30 * 60 * 1000);
    const { data: route, error: routeErr } = await supabase.from("alto_routes").insert({
      organization_id: orgId,
      vehicle_id,
      origin_lat: origin.lat,
      origin_lng: origin.lng,
      destination_lat: destination.lat,
      destination_lng: destination.lng,
      origin_address: origin.address || null,
      destination_address: destination.address || null,
      status: "planned",
      total_distance_km: routeData.distance_km,
      estimated_energy_kwh: (energyAgent?.total_kwh as number) || null,
      risk_score: (riskAgent?.composite_score as number) || null,
      sla_probability_pct: (slaAgent?.on_time_probability_pct as number) || null,
      route_polyline: routeData.polyline || null,
      agent_scores: agentScores,
      charging_stops: (chargerAgent?.stops as unknown[]) || [],
      estimated_arrival_at: estimatedArrivalAt.toISOString(),
      created_by: user.id,
    }).select().single();

    if (routeErr) console.error("Route insert error:", routeErr);

    return new Response(JSON.stringify({
      success: true,
      route: route || null,
      agent_scores: agentScores,
      route_data: {
        distance_km: routeData.distance_km,
        duration_min: routeData.duration_min,
        polyline: routeData.polyline,
        elevation_gain_m: elevationGain,
        elevation_loss_m: elevationLoss,
      },
      weather,
      chargers_available: (chargers || []).length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Route optimize error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Optimization failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
