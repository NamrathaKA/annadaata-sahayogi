// Voice-to-field endpoint: audio in (base64) → clean value for a specific form field.
// The model normalizes what the user said (e.g. "nine eight seven six..." → "9876543210").
import { createFileRoute } from "@tanstack/react-router";

const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1";

const LANG_LABEL: Record<string, string> = {
  kn: "Kannada", en: "English", hi: "Hindi", ta: "Tamil", te: "Telugu",
};

type Field = "phone" | "name" | "email" | "text" | "number" | "address";

const FIELD_INSTRUCTION: Record<Field, string> = {
  phone: "Extract ONLY the 10-digit Indian mobile number. Output digits only, no spaces, no country code, no punctuation. If unclear or fewer than 10 digits, output an empty string.",
  name: "Extract the person's full name in the SAME script the user spoke. Output only the name, no greetings, no punctuation, title case.",
  email: "Extract the email address. Lowercase. No spaces. Output only the address.",
  number: "Extract a single number. Output digits only (no units, no words).",
  address: "Extract a postal address / location. Output as a single line, preserving Indian place names in the same script the user spoke.",
  text: "Output exactly what the user said, cleaned up (remove filler words like 'um', 'uh'). Same script as spoken.",
};

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export const Route = createFileRoute("/api/voice-fill")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return Response.json({ error: "LOVABLE_API_KEY missing" }, { status: 500 });

        let body: { audio_base64?: string; mime?: string; language?: string; field?: Field };
        try { body = await request.json(); } catch { return Response.json({ error: "bad json" }, { status: 400 }); }

        const field: Field = (body.field && FIELD_INSTRUCTION[body.field] ? body.field : "text");
        const language = body.language && LANG_LABEL[body.language] ? body.language : "en";
        if (!body.audio_base64) return Response.json({ error: "missing audio" }, { status: 400 });

        const mime = body.mime || "audio/wav";
        const ext = mime.includes("wav") ? "wav" : mime.includes("mp4") ? "mp4" : "webm";
        const bytes = b64ToBytes(body.audio_base64);

        // 1. Transcribe
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
        const transcript = (sttJson.text ?? "").trim();
        if (!transcript) return Response.json({ value: "", transcript: "" });

        // 2. Extract clean value
        const sys = `You extract form-field values from spoken input. The user spoke in ${LANG_LABEL[language]}.
${FIELD_INSTRUCTION[field]}
Respond with ONLY the extracted value on a single line. No explanations, no quotes, no labels.`;
        const chatRes = await fetch(`${LOVABLE_URL}/chat/completions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3.5-flash",
            messages: [
              { role: "system", content: sys },
              { role: "user", content: transcript },
            ],
          }),
        });
        if (!chatRes.ok) {
          const err = await chatRes.text();
          return Response.json({ error: `Extract failed: ${err}`, transcript }, { status: chatRes.status });
        }
        const chatJson = (await chatRes.json()) as { choices?: Array<{ message?: { content?: string } }> };
        let value = chatJson.choices?.[0]?.message?.content?.trim() ?? "";
        // Strip common wrappers
        value = value.replace(/^["'`]+|["'`]+$/g, "").split("\n")[0].trim();
        // For phone/number, strip everything but digits as a final safety net
        if (field === "phone") value = value.replace(/\D/g, "").slice(-10);
        if (field === "number") value = value.replace(/[^\d.]/g, "");
        if (field === "email") value = value.replace(/\s+/g, "").toLowerCase();

        return Response.json({ value, transcript });
      },
    },
  },
});
