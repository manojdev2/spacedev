import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callGemini, corsHeaders } from "../_shared/callGemini.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const {
      distance_km,
      elevation_gain_m = 0,
      elevation_loss_m = 0,
      payload_kg = 0,
      vehicle_capacity_kg = 1000,
      temp_celsius = 20,
      wind_speed_ms = 0,
      battery_capacity_kwh,
      degradation_factor = 1.0,
      ac_on = false,
      driving_behavior = "normal",
    } = await req.json();

    if (!distance_km || !battery_capacity_kwh) {
      return new Response(JSON.stringify({ error: "distance_km and battery_capacity_kwh are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an EV energy consumption prediction AI for the Alto Routing Intelligence Engine.
Use the provided formula context to compute precise energy estimates. Be quantitative and precise.

ENERGY FORMULA REFERENCE:
- Base: distance_km * 0.2 kWh/km (average EV consumption)
- Terrain: elevation_gain_m * 0.0027 kWh/m (uphill costs energy)
- Regen: -elevation_loss_m * 0.0015 kWh/m (downhill recovers energy)
- Temperature: <0°C +30%, 0-10°C +15%, >35°C +10% (AC load)
- Wind: wind_speed_ms > 10 m/s adds (wind_speed_ms - 10) * 0.002 kWh/km
- Payload: (payload_kg / vehicle_capacity_kg) * 0.05 * distance_km kWh
- Driving: aggressive +20%, eco -15%, normal +0%
- Degradation: divide by degradation_factor
- AC: if ac_on and temp > 25°C add 0.02 kWh/km`;

    const userPrompt = `Predict energy consumption for this EV route:
- Distance: ${distance_km} km
- Elevation gain: ${elevation_gain_m} m, loss: ${elevation_loss_m} m
- Payload: ${payload_kg} kg (vehicle capacity: ${vehicle_capacity_kg} kg)
- Temperature: ${temp_celsius}°C, Wind: ${wind_speed_ms} m/s
- Battery: ${battery_capacity_kwh} kWh (degradation: ${degradation_factor})
- AC: ${ac_on}, Driving style: ${driving_behavior}`;

    const res = await callGemini(GEMINI_API_KEY, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [{
        type: "function",
        function: {
          name: "energy_prediction",
          description: "Return structured EV energy consumption prediction",
          parameters: {
            type: "object",
            properties: {
              base_kwh: { type: "number", description: "Base energy without any factors" },
              terrain_kwh: { type: "number", description: "Net terrain energy (positive=uphill cost, negative=regen)" },
              weather_kwh: { type: "number", description: "Temperature and wind energy penalty" },
              payload_kwh: { type: "number", description: "Payload weight energy penalty" },
              total_kwh: { type: "number", description: "Total predicted energy consumption" },
              range_remaining_km: { type: "number", description: "Estimated remaining range after route" },
              soc_at_destination_pct: { type: "number", description: "Predicted battery % at destination (0-100)" },
              confidence_pct: { type: "number", description: "Prediction confidence 0-100" },
              key_factors: {
                type: "array",
                items: { type: "string" },
                description: "Top 3 factors affecting energy consumption",
              },
            },
            required: ["base_kwh", "terrain_kwh", "weather_kwh", "payload_kwh", "total_kwh", "range_remaining_km", "soc_at_destination_pct", "confidence_pct", "key_factors"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "energy_prediction" } },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini error ${res.status}: ${err}`);
    }

    const data = await res.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error("Failed to get energy prediction");

    const prediction = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ success: true, prediction }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Energy predict error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Prediction failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
