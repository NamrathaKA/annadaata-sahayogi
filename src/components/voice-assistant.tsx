import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Loader2, Volume2, X } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";
import { toast } from "sonner";

async function encodeWav(chunks: Float32Array[], sampleRate: number): Promise<Blob> {
  const totalLen = chunks.reduce((a, c) => a + c.length, 0);
  const flat = new Float32Array(totalLen);
  let off = 0;
  for (const c of chunks) { flat.set(c, off); off += c.length; }
  // downsample to 16k
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
  write(0, "RIFF");
  view.setUint32(4, 36 + out.length * 2, true);
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

export function VoiceAssistant() {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nodeRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    nodeRef.current?.disconnect();
    sourceRef.current?.disconnect();
    ctxRef.current?.close().catch(() => {});
    streamRef.current = null;
    nodeRef.current = null;
    sourceRef.current = null;
    ctxRef.current = null;
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      sourceRef.current = src;
      const node = ctx.createScriptProcessor(4096, 1, 1);
      nodeRef.current = node;
      chunksRef.current = [];
      node.onaudioprocess = (e) => {
        chunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };
      src.connect(node);
      node.connect(ctx.destination);
      setRecording(true);
    } catch (e) {
      toast.error("Microphone permission required");
      console.error(e);
    }
  };

  const stopAndSend = async () => {
    if (!ctxRef.current) return;
    setRecording(false);
    const rate = ctxRef.current.sampleRate;
    const chunks = chunksRef.current;
    stopStream();
    if (chunks.length === 0) return;
    setBusy(true);
    try {
      const wav = await encodeWav(chunks, rate);
      if (wav.size < 2048) { toast.error("Recording too short"); return; }
      const b64 = await blobToBase64(wav);
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio_base64: b64, mime: "audio/wav", language: lang }),
      });
      const data = (await res.json()) as { transcript?: string; reply?: string; audio_base64?: string; mime?: string; error?: string };
      if (!res.ok) { toast.error(data.error || "Voice failed"); return; }
      setTranscript(data.transcript ?? "");
      setReply(data.reply ?? "");
      if (data.audio_base64) {
        const bin = atob(data.audio_base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: data.mime || "audio/mpeg" }));
        const a = new Audio(url);
        a.play().catch(() => {});
      }
    } catch (e) {
      console.error(e);
      toast.error("Voice error");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => () => stopStream(), []);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl"
        aria-label={t("voice_assistant")}
      >
        <Mic className="h-6 w-6" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 md:items-center">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{t("voice_assistant")}</h3>
              <button onClick={() => { stopStream(); setOpen(false); }} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-4 py-4">
              <button
                onMouseDown={start}
                onMouseUp={stopAndSend}
                onTouchStart={(e) => { e.preventDefault(); start(); }}
                onTouchEnd={(e) => { e.preventDefault(); stopAndSend(); }}
                disabled={busy}
                className={`flex h-24 w-24 items-center justify-center rounded-full transition ${
                  recording ? "animate-pulse bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
                } disabled:opacity-50`}
                aria-label={t("voice_hint")}
              >
                {busy ? <Loader2 className="h-8 w-8 animate-spin" /> : <Mic className="h-10 w-10" />}
              </button>
              <p className="text-sm text-muted-foreground">
                {recording ? t("voice_listening") : busy ? t("voice_thinking") : t("voice_hint")}
              </p>
            </div>

            {transcript && (
              <div className="mt-2 rounded-lg bg-muted p-3 text-sm">
                <div className="mb-1 text-xs font-semibold text-muted-foreground">You</div>
                {transcript}
              </div>
            )}
            {reply && (
              <div className="mt-2 rounded-lg bg-primary/10 p-3 text-sm">
                <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-primary">
                  <Volume2 className="h-3 w-3" /> {t("app_name")}
                </div>
                {reply}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
