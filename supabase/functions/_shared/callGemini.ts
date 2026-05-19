export const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
export const MODELS = ["gemini-3-flash-preview", "gemini-2.5-flash"];

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export async function callGemini(apiKey: string, body: Record<string, unknown>): Promise<Response> {
  for (const model of MODELS) {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, model }),
    });
    if (res.status !== 503) return res;
    console.warn(`${model} returned 503, trying fallback...`);
  }
  throw new Error("All Gemini models unavailable (503). Try again later.");
}
