import { Mic, MicOff, Radio } from "lucide-react";

interface AudioReactingHUDProps {
  isListening: boolean;
  isSpeaking: boolean;
  onToggleListening: () => void;
  onClose: () => void;
}

export function AudioReactingHUD({
  isListening,
  isSpeaking,
  onToggleListening,
  onClose,
}: AudioReactingHUDProps) {
  const active = isListening || isSpeaking;

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-3xl animate-in fade-in duration-500 overflow-hidden rounded-3xl">
      {/* Background Grid & Ambient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(50,20,80,0.1)_0%,transparent_100%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none" />

      {/* Top HUD text */}
      <div className="absolute top-10 flex flex-col items-center opacity-80 animate-pulse pointer-events-none">
        <span className="text-[10px] tracking-[0.3em] text-cyan-400/70 font-mono">
          VOICE OF ARTIFICIAL INTELLIGENCE
        </span>
        <h2 className="text-3xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-fuchsia-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)] mt-1">
          A.T.L.A.S
        </h2>
      </div>

      {/* Main HUD Circle */}
      <div className="relative flex items-center justify-center w-[400px] h-[400px]">
        {/* Outer Rotating Ring (Dashed) */}
        <div
          className="absolute inset-0 rounded-full border border-cyan-500/20 pointer-events-none"
          style={{
            borderStyle: "dashed",
            borderWidth: "1px",
            animation: "spin 20s linear infinite",
          }}
        />

        {/* Outer Rotating Ring 2 (Opposite direction) */}
        <div
          className="absolute inset-4 rounded-full border border-fuchsia-500/20 pointer-events-none"
          style={{
            borderStyle: "dashed",
            borderWidth: "2px",
            animation: "spin 15s linear infinite reverse",
          }}
        />

        {/* Data Markers */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-1 h-3 bg-cyan-400/50 rounded-full shadow-[0_0_10px_#22d3ee] pointer-events-none" />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-1 h-3 bg-cyan-400/50 rounded-full shadow-[0_0_10px_#22d3ee] pointer-events-none" />
        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-1 bg-fuchsia-400/50 rounded-full shadow-[0_0_10px_#e879f9] pointer-events-none" />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-1 bg-fuchsia-400/50 rounded-full shadow-[0_0_10px_#e879f9] pointer-events-none" />

        {/* Mid Ring (Solid Glow) */}
        <div className="absolute inset-12 rounded-full border-2 border-cyan-400/30 shadow-[0_0_30px_rgba(34,211,238,0.2)_inset,0_0_30px_rgba(34,211,238,0.2)] pointer-events-none" />

        {/* Inner Waveform (Simulated Audio Reactivity) */}
        <div
          className={`absolute inset-20 rounded-full bg-gradient-to-tr from-cyan-500/30 to-fuchsia-500/30 backdrop-blur-md border border-white/10 transition-all duration-300 pointer-events-none ${active ? "scale-110 shadow-[0_0_50px_rgba(34,211,238,0.4)]" : "scale-90 opacity-50"}`}
        >
          <div
            className="absolute inset-0 rounded-full mix-blend-overlay opacity-50"
            style={{
              background:
                "conic-gradient(from 0deg, transparent, rgba(255,255,255,0.8), transparent)",
              animation: active ? "spin 3s linear infinite" : "none",
            }}
          />
        </div>

        {/* Center Node */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={onToggleListening}
            className={`relative z-10 flex h-24 w-24 items-center justify-center rounded-full transition-all duration-500 ${
              isListening
                ? "bg-red-500/20 text-red-400 shadow-[0_0_40px_rgba(239,68,68,0.6)]"
                : isSpeaking
                  ? "bg-cyan-500/20 text-cyan-400 shadow-[0_0_40px_rgba(34,211,238,0.6)] animate-pulse"
                  : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
            }`}
          >
            {isListening ? (
              <Mic className="h-10 w-10 animate-bounce" />
            ) : isSpeaking ? (
              <Radio className="h-10 w-10 animate-pulse" />
            ) : (
              <MicOff className="h-10 w-10" />
            )}

            {/* Ripples when active */}
            {active && (
              <>
                <span
                  className={`absolute inset-0 rounded-full border animate-ping opacity-50 ${isListening ? "border-red-500" : "border-cyan-500"}`}
                  style={{ animationDuration: "1.5s" }}
                />
                <span
                  className={`absolute inset-0 rounded-full border animate-ping opacity-30 ${isListening ? "border-red-500" : "border-cyan-500"}`}
                  style={{ animationDuration: "2s", animationDelay: "0.5s" }}
                />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-12 flex items-center gap-6">
        <div className="flex flex-col items-end mr-6 border-r border-cyan-500/30 pr-6">
          <span className="text-[10px] text-cyan-400/50 font-mono tracking-widest">STATUS</span>
          <span className="text-sm font-medium text-cyan-400 shadow-cyan-500">
            {isListening
              ? "AWAITING AUDIO INPUT"
              : isSpeaking
                ? "SYNTHESIZING RESPONSE"
                : "STANDBY"}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-[10px] font-mono tracking-[0.2em] px-4 py-2 rounded-full border border-white/20 text-white/60 hover:bg-white/10 hover:text-white transition-all"
        >
          DISMISS HUD
        </button>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
