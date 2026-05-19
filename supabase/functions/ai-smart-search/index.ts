import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParsedSearchIntent {
  query: string;
  category: string | null;
  city: string | null;
  state: string | null;
  radius: number | null;
  services: string[];
  openNow: boolean;
  openLate: boolean;
  hasParking: boolean;
  wheelchair: boolean;
  sortByDistance: boolean;
  interpretation: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, userLocation, currentTime } = await req.json();

    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const systemPrompt = `You are a search intent parser for a store locator application. Parse the user's natural language query and extract structured search parameters.

Available categories: retail, warehouse, service-center, headquarters, branch

Common amenities to recognize (extract into services array with these exact normalized names):
- wifi (WiFi, Free WiFi, Internet)
- restrooms (Restrooms, Bathrooms, Toilets)
- drive-through (Drive-through, Drive-thru)
- parking (Parking, Free parking, Valet)
- ev-charging (EV charging, Electric vehicle charging)
- atm (ATM, Cash machine)
- cafe (Cafe, Coffee shop, Coffee)
- pet-friendly (Pet friendly, Dog friendly)
- outdoor-seating (Outdoor seating, Patio)
- curbside-pickup (Curbside pickup)
- delivery (Delivery available)
- gift-wrapping (Gift wrapping)
- returns (Returns accepted)
- wheelchair-accessible (Wheelchair accessible, ADA compliant)

Extract these parameters if mentioned:
- category: The type of location (retail, warehouse, service-center, headquarters, branch)
- city: City name mentioned
- state: State/region mentioned  
- radius: Distance in miles (e.g., "within 5 miles" = 5, "nearby" = 10)
- services: Specific amenities mentioned - use the normalized names above (e.g., wifi, restrooms, drive-through, parking)
- openNow: Whether they want currently open locations
- openLate: Whether they want locations open late (after 8 PM)
- hasParking: Whether parking is specifically requested (also add "parking" to services)
- wheelchair: Whether wheelchair accessibility is needed (also add "wheelchair-accessible" to services)
- sortByDistance: Whether to sort by distance (implied by "near me", "closest", etc.)
- interpretation: A brief human-readable description of what you understood

Current time context: ${currentTime || new Date().toISOString()}
User has location enabled: ${userLocation ? 'yes' : 'no'}

Important rules:
1. "near me" or "closest" implies sortByDistance: true
2. "open late" or "evening hours" implies openLate: true
3. Always use lowercase hyphenated names for services (e.g., "drive-through" not "Drive Through")
4. If no category specified, return null for category
5. Extract city names even without explicit "in [city]" phrasing
6. "retail store" = retail, "service center" = service-center, etc.
7. When user mentions parking, set BOTH hasParking: true AND include "parking" in services
8. When user mentions wheelchair/accessible, set BOTH wheelchair: true AND include "wheelchair-accessible" in services`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Parse this search query: "${query}"` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "parse_search_intent",
              description: "Parse the search query into structured parameters",
              parameters: {
                type: "object",
                properties: {
                  query: { 
                    type: "string", 
                    description: "The cleaned/normalized search query text for text matching" 
                  },
                  category: { 
                    type: "string", 
                    enum: ["retail", "warehouse", "service-center", "headquarters", "branch"],
                    nullable: true,
                    description: "Location category if specified" 
                  },
                  city: { 
                    type: "string", 
                    nullable: true,
                    description: "City name if mentioned" 
                  },
                  state: { 
                    type: "string", 
                    nullable: true,
                    description: "State/region if mentioned" 
                  },
                  radius: { 
                    type: "number", 
                    nullable: true,
                    description: "Distance radius in miles" 
                  },
                  services: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "Services/amenities requested" 
                  },
                  openNow: { 
                    type: "boolean", 
                    description: "Whether user wants currently open locations" 
                  },
                  openLate: { 
                    type: "boolean", 
                    description: "Whether user wants locations open late" 
                  },
                  hasParking: { 
                    type: "boolean", 
                    description: "Whether parking is requested" 
                  },
                  wheelchair: { 
                    type: "boolean", 
                    description: "Whether wheelchair access is needed" 
                  },
                  sortByDistance: { 
                    type: "boolean", 
                    description: "Whether to sort results by distance" 
                  },
                  interpretation: { 
                    type: "string", 
                    description: "Human-readable explanation of what was understood" 
                  }
                },
                required: ["query", "services", "openNow", "openLate", "hasParking", "wheelchair", "sortByDistance", "interpretation"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "parse_search_intent" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "parse_search_intent") {
      throw new Error("Failed to parse search intent");
    }

    const parsedIntent: ParsedSearchIntent = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ 
        success: true, 
        intent: parsedIntent,
        originalQuery: query 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI smart search error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
