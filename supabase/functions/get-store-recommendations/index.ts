import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LocationView {
  location_id: string;
  viewed_at: string;
  locations: {
    id: string;
    name: string;
    category: string;
    city: string;
    state: string;
    services: string[] | null;
  };
}

interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  category: string;
  services: string[] | null;
  lat: number;
  lng: number;
}

interface Recommendation {
  locationId: string;
  name: string;
  city: string;
  state: string;
  category: string;
  reason: string;
  score: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid user" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userLocation, limit = 5 } = await req.json();

    // Get user's browsing history (last 30 days, max 50 entries)
    const { data: viewHistory, error: historyError } = await supabaseClient
      .from("user_location_views")
      .select(`
        location_id,
        viewed_at,
        locations (
          id,
          name,
          category,
          city,
          state,
          services
        )
      `)
      .eq("user_id", user.id)
      .gte("viewed_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order("viewed_at", { ascending: false })
      .limit(50);

    if (historyError) {
      console.error("History fetch error:", historyError);
    }

    // Get user's favorites
    const { data: favorites, error: favError } = await supabaseClient
      .from("favorites")
      .select("location_id")
      .eq("user_id", user.id);

    if (favError) {
      console.error("Favorites fetch error:", favError);
    }

    // Get all active locations for recommendations
    const { data: allLocations, error: locError } = await supabaseClient
      .from("locations")
      .select("id, name, address, city, state, category, services, lat, lng")
      .eq("is_active", true)
      .limit(100);

    if (locError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch locations" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const typedHistory = (viewHistory || []) as unknown as LocationView[];
    const typedLocations = (allLocations || []) as Location[];
    const favoriteIds = new Set((favorites || []).map(f => f.location_id));
    const viewedIds = new Set(typedHistory.map(v => v.location_id));

    // Analyze user preferences from history
    const categoryCount: Record<string, number> = {};
    const cityCount: Record<string, number> = {};
    const serviceCount: Record<string, number> = {};

    for (const view of typedHistory) {
      const loc = view.locations;
      if (!loc) continue;

      categoryCount[loc.category] = (categoryCount[loc.category] || 0) + 1;
      cityCount[loc.city] = (cityCount[loc.city] || 0) + 1;
      
      if (loc.services) {
        for (const service of loc.services) {
          serviceCount[service] = (serviceCount[service] || 0) + 1;
        }
      }
    }

    // If user has no history, use AI to suggest based on location or popular stores
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (typedHistory.length === 0 || !GEMINI_API_KEY) {
      // Return simple recommendations based on location proximity or random selection
      const simpleRecs: Recommendation[] = typedLocations
        .filter(loc => !favoriteIds.has(loc.id))
        .slice(0, limit)
        .map(loc => ({
          locationId: loc.id,
          name: loc.name,
          city: loc.city,
          state: loc.state,
          category: loc.category,
          reason: "Popular in your area",
          score: 0.5,
        }));

      return new Response(
        JSON.stringify({ recommendations: simpleRecs, personalized: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build context for AI
    const topCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat]) => cat);

    const topCities = Object.entries(cityCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([city]) => city);

    const topServices = Object.entries(serviceCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([service]) => service);

    const candidateLocations = typedLocations
      .filter(loc => !viewedIds.has(loc.id) && !favoriteIds.has(loc.id))
      .slice(0, 30);

    if (candidateLocations.length === 0) {
      return new Response(
        JSON.stringify({ recommendations: [], personalized: true, message: "You've explored all available stores!" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a store recommendation engine. Based on user preferences, recommend stores they might like.

User preferences:
- Preferred categories: ${topCategories.join(", ") || "none detected"}
- Preferred cities: ${topCities.join(", ") || "none detected"}
- Interested in services: ${topServices.join(", ") || "none detected"}
- Total stores viewed: ${typedHistory.length}
- Favorite stores: ${favoriteIds.size}

Candidate stores to recommend from:
${candidateLocations.map(loc => `- ID: ${loc.id}, Name: ${loc.name}, Category: ${loc.category}, City: ${loc.city}, Services: ${(loc.services || []).join(", ")}`).join("\n")}

Select up to ${limit} stores that best match the user's preferences. For each, provide a personalized reason why they might like it.`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.0-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate personalized store recommendations." }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "recommend_stores",
              description: "Return personalized store recommendations",
              parameters: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        locationId: { type: "string", description: "The store ID" },
                        reason: { type: "string", description: "Personalized reason for recommendation (max 50 words)" },
                        score: { type: "number", description: "Confidence score 0-1" }
                      },
                      required: ["locationId", "reason", "score"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["recommendations"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "recommend_stores" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        // Fallback to simple recommendations
        const fallbackRecs = candidateLocations.slice(0, limit).map(loc => ({
          locationId: loc.id,
          name: loc.name,
          city: loc.city,
          state: loc.state,
          category: loc.category,
          reason: topCategories.includes(loc.category) 
            ? `Matches your interest in ${loc.category} stores`
            : "Recommended for you",
          score: 0.6,
        }));
        
        return new Response(
          JSON.stringify({ recommendations: fallbackRecs, personalized: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall || toolCall.function.name !== "recommend_stores") {
      throw new Error("Failed to parse recommendations");
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    
    // Enrich recommendations with location data
    const enrichedRecs: Recommendation[] = parsed.recommendations
      .map((rec: { locationId: string; reason: string; score: number }) => {
        const loc = candidateLocations.find(l => l.id === rec.locationId);
        if (!loc) return null;
        return {
          locationId: rec.locationId,
          name: loc.name,
          city: loc.city,
          state: loc.state,
          category: loc.category,
          reason: rec.reason,
          score: rec.score,
        };
      })
      .filter(Boolean)
      .slice(0, limit);

    return new Response(
      JSON.stringify({ recommendations: enrichedRecs, personalized: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Recommendations error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
