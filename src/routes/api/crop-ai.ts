// AI helpers for farmers: suggest a fair market price for a crop, and suggest
// seasonal best-selling crops for the current month + location.
import { createFileRoute } from "@tanstack/react-router";

const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "google/gemini-3.5-flash";

const LANG_LABEL: Record<string, string> = {
  kn: "Kannada", en: "English", hi: "Hindi", ta: "Tamil", te: "Telugu",
};

async function requireUser(request: Request): Promise<Response | null> {
  const auth = request.headers.get("authorization") ?? request.headers.get("Authorization");
  const token = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return Response.json({ error: "unauthorized" }, { status: 401 });
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return Response.json({ error: "server misconfigured" }, { status: 500 });
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return Response.json({ error: "unauthorized" }, { status: 401 });
  return null;
}

async function callModel(apiKey: string, sys: string, user: string): Promise<string> {
  const res = await fetch(`${LOVABLE_URL}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`AI failed: ${await res.text()}`);
  const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return j.choices?.[0]?.message?.content?.trim() ?? "";
}

function safeJson<T>(s: string): T | null {
  try { return JSON.parse(s) as T; } catch { return null; }
}

export const Route = createFileRoute("/api/crop-ai")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = await requireUser(request);
        if (unauthorized) return unauthorized;

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return Response.json({ error: "LOVABLE_API_KEY missing" }, { status: 500 });

        let body: {
          action?: "price" | "seasonal";
          crop_name?: string;
          unit?: string;
          location?: string;
          language?: string;
        };
        try { body = await request.json(); } catch { return Response.json({ error: "bad json" }, { status: 400 }); }

        const lang = body.language && LANG_LABEL[body.language] ? body.language : "en";
        const langLabel = LANG_LABEL[lang];
        const month = new Date().toLocaleString("en-US", { month: "long" });
        const location = (body.location || "Karnataka, India").slice(0, 120);

        if (body.action === "seasonal") {
          const sys = `You are an agricultural market advisor for small Indian farmers. Suggest crops that are in-season and typically fetch good market prices right now. Reply in ${langLabel}. Return STRICT JSON only.`;
          const user = `Month: ${month}. Region: ${location}.
Return JSON: { "crops": [ { "name": string, "reason": string, "price_range_inr_per_kg": string } ] }
List 5 crops, ordered by profitability + demand. "reason" must be one short sentence in ${langLabel}.`;
          try {
            const raw = await callModel(key, sys, user);
            const parsed = safeJson<{ crops: Array<{ name: string; reason: string; price_range_inr_per_kg: string }> }>(raw);
            if (!parsed?.crops) return Response.json({ error: "bad AI response", raw }, { status: 502 });
            return Response.json({ crops: parsed.crops.slice(0, 8), month, location });
          } catch (e) {
            return Response.json({ error: (e as Error).message }, { status: 502 });
          }
        }

        if (body.action === "price") {
          const crop = (body.crop_name || "").trim().slice(0, 80);
          const unit = (body.unit || "kg").slice(0, 20);
          if (!crop) return Response.json({ error: "crop_name required" }, { status: 400 });
          const sys = `You are an Indian mandi (wholesale market) price advisor for small farmers. Give realistic INR price ranges based on recent trends. Reply in ${langLabel}. Return STRICT JSON only.`;
          const user = `Crop: ${crop}. Unit: ${unit}. Month: ${month}. Region: ${location}.
Return JSON: { "min": number, "max": number, "suggested": number, "note": string }
All prices are INR per ${unit}. "note" is one short sentence in ${langLabel} explaining the range.`;
          try {
            const raw = await callModel(key, sys, user);
            const parsed = safeJson<{ min: number; max: number; suggested: number; note: string }>(raw);
            if (!parsed || typeof parsed.suggested !== "number") return Response.json({ error: "bad AI response", raw }, { status: 502 });
            return Response.json(parsed);
          } catch (e) {
            return Response.json({ error: (e as Error).message }, { status: 502 });
          }
        }

        return Response.json({ error: "unknown action" }, { status: 400 });
      },
    },
  },
});
