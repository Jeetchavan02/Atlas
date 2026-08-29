import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Activity,
  Heart,
  Moon,
  Scale,
  Watch,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Droplets,
  Flame,
  FootprintsIcon,
} from "lucide-react";

export const Route = createFileRoute("/sync")({
  component: SyncPage,
});

interface SyncResult {
  ok: boolean;
  source: string;
  error?: string;
}

function StatInput({
  label,
  icon: Icon,
  name,
  placeholder,
  unit,
  color = "text-iris",
}: {
  label: string;
  icon: React.ElementType;
  name: string;
  placeholder: string;
  unit: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-2 text-xs font-medium text-white/60">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        {label}
      </label>
      <div className="glass-pill flex items-center gap-2 px-3 py-2.5">
        <input
          type="number"
          name={name}
          placeholder={placeholder}
          step="any"
          className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 focus:outline-none"
        />
        <span className="shrink-0 text-[11px] text-white/35 font-mono">{unit}</span>
      </div>
    </div>
  );
}

function SyncPage() {
  const [zeppStatus, setZeppStatus] = useState<SyncResult | null>(null);
  const [okokStatus, setOkokStatus] = useState<SyncResult | null>(null);
  const [huaweiStatus, setHuaweiStatus] = useState<SyncResult | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const BASE = "http://localhost:4000";

  const getFormValues = (form: HTMLFormElement): Record<string, number> => {
    const data = new FormData(form);
    const result: Record<string, number> = {};
    data.forEach((val, key) => {
      const n = parseFloat(val as string);
      if (!isNaN(n)) result[key] = n;
    });
    return result;
  };

  const handleZepp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading("zepp");
    const body = getFormValues(e.currentTarget);
    try {
      const res = await fetch(`${BASE}/api/sync/zepp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setZeppStatus({ ok: data.ok, source: "Zepp / Amazfit" });
    } catch {
      setZeppStatus({ ok: false, source: "Zepp / Amazfit", error: "Connection refused — is the backend running?" });
    } finally {
      setLoading(null);
    }
  };

  const handleOkok = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading("okok");
    const body = getFormValues(e.currentTarget);
    try {
      const res = await fetch(`${BASE}/api/sync/okok`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setOkokStatus({ ok: data.ok, source: "OKOK Scale" });
    } catch {
      setOkokStatus({ ok: false, source: "OKOK Scale", error: "Connection refused — is the backend running?" });
    } finally {
      setLoading(null);
    }
  };

  const handleHuawei = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading("huawei");
    const body = getFormValues(e.currentTarget);
    try {
      const res = await fetch(`${BASE}/api/sync/huawei`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setHuaweiStatus({ ok: data.ok, source: "Huawei Health" });
    } catch {
      setHuaweiStatus({ ok: false, source: "Huawei Health", error: "Connection refused — is the backend running?" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--gradient-iris)] shadow-[var(--shadow-glow)]">
          <Watch className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">ATLAS Data Sync</h1>
        <p className="mt-1 text-sm text-white/45">Push real data from your devices to ATLAS</p>
      </div>

      <div className="mx-auto max-w-lg space-y-5">
        {/* ─── Zepp OS / Amazfit ───────────────────────────────────────────────── */}
        <div className="glass-card p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-iris/20">
              <Activity className="h-4 w-4 text-iris" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Zepp OS / Amazfit</h2>
              <p className="text-[11px] text-white/40">Sleep, HR, HRV, Steps, SpO2</p>
            </div>
          </div>

          <form onSubmit={handleZepp} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <StatInput label="Steps" icon={FootprintsIcon} name="steps" placeholder="8500" unit="steps" color="text-mint" />
              <StatInput label="Sleep" icon={Moon} name="sleepHours" placeholder="7.5" unit="hrs" color="text-iris" />
              <StatInput label="Sleep Score" icon={Moon} name="sleepScore" placeholder="78" unit="/100" color="text-iris" />
              <StatInput label="Resting HR" icon={Heart} name="restingHeartRate" placeholder="58" unit="bpm" color="text-red-400" />
              <StatInput label="Live HR" icon={Heart} name="liveHeartRate" placeholder="72" unit="bpm" color="text-red-400" />
              <StatInput label="HRV" icon={Zap} name="hrv" placeholder="45" unit="ms" color="text-yellow-400" />
              <StatInput label="SpO2" icon={Activity} name="spo2" placeholder="98" unit="%" color="text-cyan-400" />
              <StatInput label="Stress Score" icon={Zap} name="stressScore" placeholder="32" unit="/100" color="text-orange-400" />
            </div>

            <button
              type="submit"
              disabled={loading === "zepp"}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--gradient-iris)] py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition-all hover:opacity-90 disabled:opacity-50"
            >
              {loading === "zepp" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Watch className="h-4 w-4" />
              )}
              Sync Zepp Data
            </button>

            {zeppStatus && (
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${zeppStatus.ok ? "bg-mint/10 text-mint border border-mint/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                {zeppStatus.ok ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
                {zeppStatus.ok ? "Zepp data synced successfully" : (zeppStatus.error ?? "Sync failed")}
              </div>
            )}
          </form>
        </div>

        {/* ─── OKOK International Scale ───────────────────────────────────────── */}
        <div className="glass-card p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint/20">
              <Scale className="h-4 w-4 text-mint" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">OKOK International Scale</h2>
              <p className="text-[11px] text-white/40">Weight & Body Composition</p>
            </div>
          </div>

          <form onSubmit={handleOkok} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <StatInput label="Weight" icon={Scale} name="weight" placeholder="75.5" unit="kg" color="text-mint" />
              <StatInput label="Body Fat" icon={Activity} name="bodyFat" placeholder="18.2" unit="%" color="text-yellow-400" />
            </div>

            <button
              type="submit"
              disabled={loading === "okok"}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-mint/20 border border-mint/30 py-2.5 text-sm font-semibold text-mint transition-all hover:bg-mint/30 disabled:opacity-50"
            >
              {loading === "okok" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Scale className="h-4 w-4" />
              )}
              Sync Scale Data
            </button>

            {okokStatus && (
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${okokStatus.ok ? "bg-mint/10 text-mint border border-mint/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                {okokStatus.ok ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
                {okokStatus.ok ? "Scale data synced successfully" : (okokStatus.error ?? "Sync failed")}
              </div>
            )}
          </form>
        </div>

        {/* ─── Huawei Health ──────────────────────────────────────────────────── */}
        <div className="glass-card p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/15">
              <Heart className="h-4 w-4 text-red-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Huawei Health</h2>
              <p className="text-[11px] text-white/40">Steps, Calories, Water, HR</p>
            </div>
          </div>

          <form onSubmit={handleHuawei} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <StatInput label="Steps" icon={FootprintsIcon} name="steps" placeholder="9200" unit="steps" color="text-mint" />
              <StatInput label="Calories Burned" icon={Flame} name="caloriesBurned" placeholder="420" unit="kcal" color="text-orange-400" />
              <StatInput label="Water" icon={Droplets} name="waterLiters" placeholder="2.4" unit="L" color="text-cyan-400" />
              <StatInput label="Resting HR" icon={Heart} name="restingHeartRate" placeholder="58" unit="bpm" color="text-red-400" />
            </div>

            <button
              type="submit"
              disabled={loading === "huawei"}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/15 border border-red-500/25 py-2.5 text-sm font-semibold text-red-300 transition-all hover:bg-red-500/25 disabled:opacity-50"
            >
              {loading === "huawei" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Heart className="h-4 w-4" />
              )}
              Sync Huawei Data
            </button>

            {huaweiStatus && (
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${huaweiStatus.ok ? "bg-mint/10 text-mint border border-mint/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                {huaweiStatus.ok ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
                {huaweiStatus.ok ? "Huawei data synced successfully" : (huaweiStatus.error ?? "Sync failed")}
              </div>
            )}
          </form>
        </div>

        <p className="pb-8 text-center text-[11px] text-white/25">
          All data is stored locally on your Atlas server. No cloud transmission.
        </p>
      </div>
    </div>
  );
}
