// Mic button that fills a form field by voice.
// Records short PCM audio, uploads to /api/voice-fill, and returns the extracted value.
import { useRef, useState } from "react";
import { Mic, Loader2, Check } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";
import { toast } from "sonner";

type Field = "phone" | "name" | "email" | "text" | "number" | "address";

async function encodeWav(chunks: Float32Array[], sampleRate: number): Promise<Blob> {
  const totalLen = chunks.reduce((a, c) => a + c.length, 0);
  const flat = new Float32Array(totalLen);
  let off = 0;
  for (const c of chunks) { flat.set(c, off); off += c.length; }
  const targetRate = 16000;
  const ratio = sampleRate / targetRate;
  const outLen = Math.floor(flat.length / ratio);
  const out = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const s = Math.max(-1, Math.min(1, flat[Math.floor(i * ratio)] || 0));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const buffer = new ArrayBuffer(44 + out.length * 2);
  const view = new DataView(buffer);
  const write = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  write(0, "RIFF"); view.setUint32(4, 36 + out.length * 2, true);
  write(8, "WAVE"); write(12, "fmt "); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, targetRate, true); view.setUint32(28, targetRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  write(36, "data"); view.setUint32(40, out.length * 2, true);
  new Int16Array(buffer, 44).set(out);
  return new Blob([buffer], { type: "audio/wav" });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = reject;
    r.onload = () => {
      const s = String(r.result);
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    r.readAsDataURL(blob);
  });
}

export function VoiceInput({ field, onValue, ariaLabel }: {
  field: Field;
  onValue: (value: string) => void;
  ariaLabel?: string;
}) {
  const { lang, t } = useI18n();
  const [state, setState] = useState<"idle" | "recording" | "busy" | "ok">("idle");
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nodeRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);

  const cleanup = () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    nodeRef.current?.disconnect();
    sourceRef.current?.disconnect();
    ctxRef.current?.close().catch(() => {});
    streamRef.current = null; nodeRef.current = null; sourceRef.current = null; ctxRef.current = null;
  };

  const start = async () => {
    if (state !== "idle") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext(); ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream); sourceRef.current = src;
      const node = ctx.createScriptProcessor(4096, 1, 1); nodeRef.current = node;
      chunksRef.current = [];
      node.onaudioprocess = (e) => {
        chunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };
      src.connect(node); node.connect(ctx.destination);
      setState("recording");
    } catch (e) {
      console.error(e);
      toast.error(t("voice_mic_denied"));
    }
  };

  const stopAndSend = async () => {
    if (state !== "recording" || !ctxRef.current) { cleanup(); setState("idle"); return; }
    const rate = ctxRef.current.sampleRate;
    const chunks = chunksRef.current;
    cleanup();
    if (chunks.length === 0) { setState("idle"); return; }
    setState("busy");
    try {
      const wav = await encodeWav(chunks, rate);
      if (wav.size < 2048) { toast.error(t("voice_too_short")); setState("idle"); return; }
      const b64 = await blobToBase64(wav);
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) { toast.error(t("voice_no_value")); setState("idle"); return; }
      const res = await fetch("/api/voice-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ audio_base64: b64, mime: "audio/wav", language: lang, field }),
      });
      const data = (await res.json()) as { value?: string; error?: string };
      if (!res.ok || data.error) {
        toast.error(data.error || "Voice failed");
        setState("idle");
        return;
      }
      const value = (data.value ?? "").trim();
      if (!value) {
        toast.error(t("voice_no_value"));
        setState("idle");
        return;
      }
      onValue(value);
      setState("ok");
      setTimeout(() => setState("idle"), 1200);
    } catch (e) {
      console.error(e);
      toast.error("Voice error");
      setState("idle");
    }
  };

  const busy = state === "busy";
  const rec = state === "recording";
  const ok = state === "ok";

  return (
    <button
      type="button"
      onMouseDown={start}
      onMouseUp={stopAndSend}
      onMouseLeave={() => { if (rec) stopAndSend(); }}
      onTouchStart={(e) => { e.preventDefault(); start(); }}
      onTouchEnd={(e) => { e.preventDefault(); stopAndSend(); }}
      disabled={busy}
      aria-label={ariaLabel ?? t("voice_fill")}
      title={t("voice_press_hold")}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border transition ${
        rec ? "animate-pulse border-destructive bg-destructive text-destructive-foreground"
          : ok ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background hover:bg-muted"
      } disabled:opacity-50`}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : ok ? <Check className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </button>
  );
}
