// Voice assistant endpoint: audio in (base64 webm/wav) → transcript + assistant reply text + TTS audio (base64 mp3).
// The assistant answers in the caller's preferred language and, when relevant, hints an in-app action.
import { createFileRoute } from "@tanstack/react-router";

const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1";

const SYSTEM_PROMPT = (langLabel: string) => `You are FarmPido's voice assistant for Indian farmers, buyers, and delivery partners.
Respond ONLY in ${langLabel}. Keep replies short and clear (1-3 sentences).
You help with:
- Explaining how to register, list a crop, place an order, or accept a delivery.
- Reading their orders or listings status when they ask.
- General crop, weather, or market advice.
Do not invent order data. If they ask about their specific orders, tell them to check the dashboard.`;

const LANG_LABEL: Record<string, string> = {
  kn: "Kannada (ಕನ್ನಡ)",
  en: "English",
  hi: "Hindi (हिन्दी)",
  ta: "Tamil",
  te: "Telugu",
};

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

const MAX_AUDIO_B64 = 2_500_000; // ~1.8MB decoded
const MAX_TEXT = 4000;

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

export const Route = createFileRoute("/api/voice")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = await requireUser(request);
        if (unauthorized) return unauthorized;

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return Response.json({ error: "LOVABLE_API_KEY missing" }, { status: 500 });

        let body: { audio_base64?: string; mime?: string; language?: string; text?: string };
        try { body = await request.json(); } catch { return Response.json({ error: "bad json" }, { status: 400 }); }

        if (body.audio_base64 && body.audio_base64.length > MAX_AUDIO_B64) {
          return Response.json({ error: "audio too large" }, { status: 413 });
        }
        if (body.text && body.text.length > MAX_TEXT) {
          return Response.json({ error: "text too large" }, { status: 413 });
        }

        const language = body.language && LANG_LABEL[body.language] ? body.language : "kn";
        const langLabel = LANG_LABEL[language];

        // 1. Transcribe (if audio provided)
        let transcript = (body.text ?? "").trim();
        if (!transcript) {
          if (!body.audio_base64) return Response.json({ error: "missing audio_base64 or text" }, { status: 400 });
          const mime = body.mime || "audio/webm";
          const ext = mime.includes("wav") ? "wav" : mime.includes("mp4") ? "mp4" : mime.includes("mpeg") ? "mp3" : "webm";
          const bytes = b64ToBytes(body.audio_base64);
          const fd = new FormData();
          fd.append("model", "openai/gpt-4o-mini-transcribe");
          fd.append("file", new Blob([bytes as BlobPart], { type: mime }), `rec.${ext}`);
          const sttRes = await fetch(`${LOVABLE_URL}/audio/transcriptions`, {
            method: "POST",
            headers: { Authorization: `Bearer ${key}` },
            body: fd,
          });
          if (!sttRes.ok) {
            const err = await sttRes.text();
            return Response.json({ error: `STT failed: ${err}` }, { status: sttRes.status });
          }
          const sttJson = (await sttRes.json()) as { text?: string };
          transcript = (sttJson.text ?? "").trim();
        }
        if (!transcript) return Response.json({ error: "empty transcript" }, { status: 400 });

        // 2. Chat: intent + reply
        const chatRes = await fetch(`${LOVABLE_URL}/chat/completions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3.5-flash",
            messages: [
              { role: "system", content: SYSTEM_PROMPT(langLabel) },
              { role: "user", content: transcript },
            ],
          }),
        });
        if (!chatRes.ok) {
          const err = await chatRes.text();
          return Response.json({ error: `Chat failed: ${err}`, transcript }, { status: chatRes.status });
        }
        const chatJson = (await chatRes.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const reply = chatJson.choices?.[0]?.message?.content?.trim() ?? "";

        // 3. TTS (non-streaming, mp3)
        let audioReply: string | null = null;
        try {
          const ttsRes = await fetch(`${LOVABLE_URL}/audio/speech`, {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "openai/gpt-4o-mini-tts",
              input: reply,
              voice: "alloy",
              response_format: "mp3",
            }),
          });
          if (ttsRes.ok) {
            const buf = new Uint8Array(await ttsRes.arrayBuffer());
            audioReply = bytesToB64(buf);
          }
        } catch { /* audio optional */ }

        return Response.json({ transcript, reply, audio_base64: audioReply, mime: "audio/mpeg" });
      },
    },
  },
});
