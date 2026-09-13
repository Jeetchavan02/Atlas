import { useEffect, useRef, useCallback } from "react";
import { useGlobalChat, type VoiceState } from "@/context/ChatContext";

/**
 * AtlasSphere — The visual identity and voice interface of Atlas.
 *
 * This is NOT a decoration. It is Atlas's primary HMI element.
 * It consumes VoiceState from ChatContext (single source of truth)
 * and uses real microphone amplitude during LISTENING via AudioContext.
 *
 * States: IDLE | LISTENING | THINKING | ACTING | SPEAKING | ERROR
 */

interface AtlasSphereProps {
  /** Override size. Defaults to responsive clamp. */
  size?: number;
}

export function AtlasSphere({ size }: AtlasSphereProps) {
  const { voiceState } = useGlobalChat();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const amplitudeRef = useRef(0);
  const smoothAmpRef = useRef(0);
  const startTimeRef = useRef(Date.now());

  // ── Microphone hookup for LISTENING ──────────────────────────
  const setupMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyserRef.current = analyser;
    } catch {
      // Mic unavailable — sphere will use fallback idle animation
    }
  }, []);

  const teardownMic = useCallback(() => {
    streamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
    amplitudeRef.current = 0;
  }, []);

  useEffect(() => {
    if (voiceState === "LISTENING") {
      setupMic();
    } else {
      teardownMic();
    }
    return teardownMic;
  }, [voiceState, setupMic, teardownMic]);

  // ── Canvas animation loop ───────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    startTimeRef.current = Date.now();

    const dataArray = new Uint8Array(128);

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cx = w / 2;
      const cy = h / 2;
      const baseR = Math.min(w, h) * 0.35;
      const t = (Date.now() - startTimeRef.current) / 1000;

      // Read mic amplitude
      if (voiceState === "LISTENING" && analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        amplitudeRef.current = (sum / dataArray.length) / 255;
      } else {
        amplitudeRef.current = 0;
      }
      // Smooth amplitude
      smoothAmpRef.current += (amplitudeRef.current - smoothAmpRef.current) * 0.15;
      const amp = smoothAmpRef.current;

      ctx.clearRect(0, 0, w, h);

      // ── State-dependent parameters ────────────────────────
      const cfg = stateConfig(voiceState, t, amp);

      // ── Ambient glow ──────────────────────────────────────
      const glowGrad = ctx.createRadialGradient(cx, cy, baseR * 0.5, cx, cy, baseR * 2);
      glowGrad.addColorStop(0, cfg.glowInner);
      glowGrad.addColorStop(1, "transparent");
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, w, h);

      // ── Outer ring ────────────────────────────────────────
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * cfg.ringSpeed);
      ctx.beginPath();
      ctx.arc(0, 0, baseR * 1.15 * cfg.scale, 0, Math.PI * 2);
      ctx.strokeStyle = cfg.ringColor;
      ctx.lineWidth = 1;
      if (voiceState === "THINKING") ctx.setLineDash([4, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // ── Main sphere ───────────────────────────────────────
      const r = baseR * cfg.scale;

      // Core gradient
      ctx.save();
      ctx.translate(cx, cy);

      const sphereGrad = ctx.createRadialGradient(
        -r * 0.25, -r * 0.25, r * 0.05,
        0, 0, r
      );
      sphereGrad.addColorStop(0, cfg.highlightColor);
      sphereGrad.addColorStop(0.3, cfg.midColor);
      sphereGrad.addColorStop(0.7, cfg.coreColor);
      sphereGrad.addColorStop(1, cfg.edgeColor);

      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = sphereGrad;
      ctx.fill();

      // ── Internal caustic / light sweep ────────────────────
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = cfg.causticAlpha;
      ctx.rotate(t * cfg.causticSpeed);
      const sweepGrad = ctx.createConicGradient(0, 0, 0);
      sweepGrad.addColorStop(0, "transparent");
      sweepGrad.addColorStop(0.15, cfg.causticColor);
      sweepGrad.addColorStop(0.3, "transparent");
      sweepGrad.addColorStop(0.65, "transparent");
      sweepGrad.addColorStop(0.8, cfg.causticColor2);
      sweepGrad.addColorStop(0.95, "transparent");
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2);
      ctx.fillStyle = sweepGrad;
      ctx.fill();
      ctx.restore();

      // ── Specular highlight ────────────────────────────────
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const specGrad = ctx.createRadialGradient(
        -r * 0.3, -r * 0.35, 0,
        -r * 0.2, -r * 0.25, r * 0.6
      );
      specGrad.addColorStop(0, "rgba(255,255,255,0.35)");
      specGrad.addColorStop(0.5, "rgba(255,255,255,0.05)");
      specGrad.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = specGrad;
      ctx.fill();
      ctx.restore();

      // ── Edge rim light ────────────────────────────────────
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.strokeStyle = cfg.rimColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();

      // ── LISTENING ripples ─────────────────────────────────
      if (voiceState === "LISTENING" && amp > 0.02) {
        const pulseR = baseR * 1.2 + amp * baseR * 0.5;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.beginPath();
        ctx.arc(0, 0, pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(34, 211, 238, ${0.15 + amp * 0.3})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }

      // ── ACTING orbital particle ───────────────────────────
      if (voiceState === "ACTING") {
        const orbitR = baseR * 1.3;
        const px = cx + Math.cos(t * 2) * orbitR;
        const py = cy + Math.sin(t * 2) * orbitR;
        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(52, 211, 153, 0.8)";
        ctx.shadowColor = "rgba(52, 211, 153, 0.6)";
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.restore();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [voiceState]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none"
      style={{
        width: size ? `${size}px` : "clamp(240px, 28vw, 380px)",
        height: size ? `${size}px` : "clamp(240px, 28vw, 380px)",
      }}
    />
  );
}

// ── State config ────────────────────────────────────────────────
function stateConfig(state: VoiceState, t: number, amp: number) {
  const base = {
    scale: 1 + Math.sin(t * 0.8) * 0.015,
    ringSpeed: 0.15,
    ringColor: "rgba(255,255,255,0.06)",
    glowInner: "rgba(120, 50, 200, 0.12)",
    highlightColor: "rgba(255,255,255,0.6)",
    midColor: "rgba(140, 60, 220, 0.7)",
    coreColor: "rgba(60, 20, 120, 0.9)",
    edgeColor: "rgba(10, 5, 30, 1)",
    causticAlpha: 0.12,
    causticSpeed: 0.3,
    causticColor: "rgba(180, 120, 255, 0.3)",
    causticColor2: "rgba(80, 200, 240, 0.15)",
    rimColor: "rgba(180, 120, 255, 0.15)",
  };

  switch (state) {
    case "LISTENING":
      return {
        ...base,
        scale: 1.02 + amp * 0.25 + Math.sin(t * 2) * 0.01,
        ringSpeed: 0.4,
        ringColor: `rgba(34, 211, 238, ${0.12 + amp * 0.3})`,
        glowInner: `rgba(34, 211, 238, ${0.15 + amp * 0.25})`,
        midColor: "rgba(20, 140, 200, 0.7)",
        coreColor: "rgba(10, 80, 150, 0.9)",
        causticAlpha: 0.2 + amp * 0.3,
        causticSpeed: 0.6 + amp * 2,
        causticColor: "rgba(34, 211, 238, 0.4)",
        causticColor2: "rgba(120, 220, 255, 0.25)",
        rimColor: `rgba(34, 211, 238, ${0.2 + amp * 0.4})`,
      };

    case "THINKING":
      return {
        ...base,
        scale: 1 + Math.sin(t * 1.5) * 0.02,
        ringSpeed: 0.5,
        ringColor: "rgba(180, 120, 255, 0.12)",
        causticAlpha: 0.15 + Math.sin(t * 2) * 0.05,
        causticSpeed: 0.5,
      };

    case "SPEAKING":
      // Smooth deterministic speech animation
      const speechWave = Math.sin(t * 4) * 0.4 + Math.sin(t * 7.3) * 0.3 + Math.sin(t * 11) * 0.15;
      const normSpeech = (speechWave + 0.85) / 1.7; // ~0 to 1
      return {
        ...base,
        scale: 1.02 + normSpeech * 0.12,
        ringSpeed: 0.35,
        ringColor: `rgba(34, 211, 238, ${0.08 + normSpeech * 0.15})`,
        glowInner: `rgba(34, 211, 238, ${0.12 + normSpeech * 0.15})`,
        midColor: "rgba(20, 120, 180, 0.7)",
        coreColor: "rgba(15, 70, 140, 0.85)",
        causticAlpha: 0.15 + normSpeech * 0.15,
        causticSpeed: 0.5 + normSpeech * 0.5,
        causticColor: "rgba(34, 211, 238, 0.35)",
        causticColor2: "rgba(100, 200, 255, 0.2)",
        rimColor: `rgba(34, 211, 238, ${0.15 + normSpeech * 0.2})`,
      };

    case "ACTING":
      return {
        ...base,
        scale: 1.05 + Math.sin(t * 1.2) * 0.015,
        ringSpeed: 0.6,
        ringColor: "rgba(52, 211, 153, 0.15)",
        glowInner: "rgba(52, 211, 153, 0.12)",
        midColor: "rgba(20, 160, 100, 0.6)",
        coreColor: "rgba(10, 80, 60, 0.85)",
        causticColor: "rgba(52, 211, 153, 0.3)",
        causticColor2: "rgba(80, 240, 180, 0.2)",
        rimColor: "rgba(52, 211, 153, 0.2)",
      };

    case "ERROR":
      return {
        ...base,
        scale: 0.97 + Math.sin(t * 3) * 0.01,
        ringColor: "rgba(239, 68, 68, 0.12)",
        glowInner: "rgba(239, 68, 68, 0.08)",
        midColor: "rgba(180, 40, 40, 0.5)",
        coreColor: "rgba(80, 15, 15, 0.8)",
        rimColor: "rgba(239, 68, 68, 0.15)",
        causticColor: "rgba(239, 68, 68, 0.2)",
      };

    default:
      return base;
  }
}
