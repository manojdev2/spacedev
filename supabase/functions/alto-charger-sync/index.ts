import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/callGemini.ts";

const OCM_BASE = "https://api.openchargemap.io/v3/poi/";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { lat = 40.7128, lng = -74.0060, radius_km = 80, max_results = 200 } = body;

    const ocmKey = Deno.env.get("OPEN_CHARGE_MAP_API_KEY") || "";
    const params = new URLSearchParams({
      output: "json",
      latitude: String(lat),
      longitude: String(lng),
      distance: String(radius_km),
      distanceunit: "KM",
      maxresults: String(max_results),
      compact: "true",
      verbose: "false",
      ...(ocmKey ? { key: ocmKey } : {}),
    });

    const ocmRes = await fetch(`${OCM_BASE}?${params}`);
    if (!ocmRes.ok) {
      throw new Error(`Open Charge Map API error: ${ocmRes.status}`);
    }

    const stations = await ocmRes.json();
    let synced = 0;

    for (const s of stations) {
      if (!s.AddressInfo?.Latitude || !s.AddressInfo?.Longitude) continue;

      const connectors = (s.Connections || [])
        .map((c: Record<string, unknown>) => (c.ConnectionType as { Title?: string })?.Title)
        .filter(Boolean);

      const maxKw = (s.Connections || []).reduce((max: number, c: Record<string, unknown>) => {
        const kw = Number((c as { PowerKW?: number }).PowerKW) || 0;
        return kw > max ? kw : max;
      }, 0);

      const { error } = await supabase.from("alto_charging_stations").upsert({
        ocm_id: String(s.ID),
        name: s.AddressInfo?.Title || "Unknown Station",
        lat: s.AddressInfo.Latitude,
        lng: s.AddressInfo.Longitude,
        address: [
          s.AddressInfo?.AddressLine1,
          s.AddressInfo?.Town,
          s.AddressInfo?.StateOrProvince,
        ].filter(Boolean).join(", "),
        connector_types: connectors,
        max_kw: maxKw || null,
        num_chargers: s.NumberOfPoints || 1,
        current_availability: s.NumberOfPoints || 1,
        last_synced_at: new Date().toISOString(),
        is_active: s.StatusType?.IsOperational !== false,
      }, { onConflict: "ocm_id" });

      if (!error) synced++;
    }

    return new Response(JSON.stringify({
      success: true,
      total_found: stations.length,
      synced,
      location: { lat, lng, radius_km },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Charger sync error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Sync failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
