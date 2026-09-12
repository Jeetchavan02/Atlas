/**
 * Devices — Hardware connections and service integrations
 *
 * Conceptual split:
 *   HARDWARE    — physical devices (watch, scale)
 *   INTEGRATIONS — services (Zepp Health, Huawei Health)
 *
 * Data push forms are the current mechanism because the watch
 * OS apps do not expose automatic APIs yet.
 * This distinction is clear in the UI and does not claim
 * unsupported automatic sync capability.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Watch, Scale, Smartphone, Loader2, CheckCircle2, AlertCircle,
  ArrowRight, Droplets, Flame, Heart, Activity, FootprintsIcon,
  Zap, Moon,
} from "lucide-react";
import { PageHeader } from "@/components/atlas-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/sync")({
  head: () => ({
    meta: [
      { title: "Devices — Atlas OS" },
      { name: "description", content: "Atlas Devices: hardware connections and service integrations." },
    ],
  }),
  component: DevicesPage,
});

type SyncResult = { ok: boolean; source: string; error?: string };
type LoadingKey = "zepp" | "okok" | "huawei" | null;

const BASE = "http://localhost:4000";

// ── Sub-components ────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <p className="atlas-label">{label}</p>
      <div className="atlas-divider flex-1" />
    </div>
  );
}

function DeviceRow({
  icon: Icon, name, detail, status,
}: { icon: React.ElementType; name: string; detail: string; status: "connected" | "manual" | "offline" }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/[0.05] last:border-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-white/40">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] text-white/75">{name}</p>
        <p className="text-[11px] text-white/35">{detail}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{
            background:
              status === "connected" ? "var(--color-healthy)" :
              status === "manual"    ? "var(--color-attention)" :
                                       "oklch(1 0 0 / 0.15)",
          }}
        />
        <span
          className="font-mono text-[9px]"
          style={{
            color:
              status === "connected" ? "var(--color-healthy)" :
              status === "manual"    ? "var(--color-attention)" :
                                       "oklch(1 0 0 / 0.25)",
          }}
        >
          {status === "connected" ? "Connected" : status === "manual" ? "Manual push" : "Offline"}
        </span>
      </div>
    </div>
  );
}

function FieldInput({
  label, name, placeholder, unit, icon: Icon,
}: { label: string; name: string; placeholder: string; unit: string; icon: React.ElementType }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="flex items-center gap-1.5 text-[10px] text-white/45">
        <Icon className="h-2.5 w-2.5" />
        {label}
      </Label>
      <div className="flex items-center gap-2 rounded border border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5">
        <Input
          type="number"
          name={name}
          placeholder={placeholder}
          step="any"
          className="flex-1 border-0 bg-transparent p-0 text-[12.5px] text-white placeholder:text-white/20 focus-visible:ring-0"
        />
        <span className="shrink-0 font-mono text-[9px] text-white/25">{unit}</span>
      </div>
    </div>
  );
}

function SyncFeedback({ status }: { status: SyncResult }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md px-3 py-2 text-[11px] ${
        status.ok
          ? "bg-[color-mix(in_oklab,var(--color-healthy)_8%,transparent)] border border-[color-mix(in_oklab,var(--color-healthy)_15%,transparent)] text-[color:var(--color-healthy)]"
          : "bg-red-500/6 border border-red-500/15 text-red-400"
      }`}
    >
      {status.ok ? (
        <CheckCircle2 className="h-3 w-3 shrink-0" />
      ) : (
        <AlertCircle className="h-3 w-3 shrink-0" />
      )}
      <span>
        {status.ok
          ? `${status.source} synced successfully`
          : (status.error ?? "Sync failed — is the backend running?")}
      </span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────

function DevicesPage() {
  const [loading, setLoading]         = useState<LoadingKey>(null);
  const [zeppResult, setZeppResult]   = useState<SyncResult | null>(null);
  const [okokResult, setOkokResult]   = useState<SyncResult | null>(null);
  const [huaweiResult, setHuaweiResult] = useState<SyncResult | null>(null);

  const getFormValues = (form: HTMLFormElement): Record<string, number> => {
    const data = new FormData(form);
    const result: Record<string, number> = {};
    data.forEach((val, key) => {
      const n = parseFloat(val as string);
      if (!isNaN(n)) result[key] = n;
    });
    return result;
  };

  const submit = async (
    key: "zepp" | "okok" | "huawei",
    endpoint: string,
    e: React.FormEvent<HTMLFormElement>,
    setResult: (r: SyncResult) => void,
    label: string,
  ) => {
    e.preventDefault();
    setLoading(key);
    const body = getFormValues(e.currentTarget);
    try {
      const res = await fetch(`${BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setResult({ ok: data.ok, source: label });
    } catch {
      setResult({ ok: false, source: label, error: "Connection refused — backend offline?" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="System · Devices"
        title="What Atlas can see."
        subtitle="Hardware connected to Atlas and services that push data."
      />

      <div className="mx-auto max-w-lg space-y-8">

        {/* ── HARDWARE ────────────────────────────────────── */}
        <section>
          <SectionDivider label="Hardware" />
          <div className="glass-card p-4">
            <DeviceRow icon={Watch}      name="Amazfit Bip 6"         detail="Zepp OS 4.x · Wrist-worn" status="manual" />
            <DeviceRow icon={Scale}      name="OKOK Smart Scale"      detail="Bluetooth · Body composition"  status="manual" />
            <DeviceRow icon={Smartphone} name="iPhone (planned)"      detail="HealthKit integration — Phase 2" status="offline" />
          </div>
          <p className="mt-2 px-1 atlas-label text-right">
            Manual push = data sent via form below
          </p>
        </section>

        {/* ── INTEGRATIONS ────────────────────────────────── */}
        <section>
          <SectionDivider label="Integrations" />

          {/* Zepp OS */}
          <div className="glass-card mb-4 overflow-hidden">
            <div className="flex items-center gap-3 border-b border-white/[0.055] px-4 py-3">
              <div className="flex-1">
                <p className="text-[12.5px] font-medium text-white/80">Zepp Health</p>
                <p className="text-[11px] text-white/35">Sleep · HR · HRV · Steps · SpO2 · Stress</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--color-attention)" }} />
                <span className="font-mono text-[9px]" style={{ color: "var(--color-attention)" }}>Manual push</span>
              </div>
            </div>
            <form
              onSubmit={(e) => submit("zepp", "/api/sync/zepp", e, setZeppResult, "Zepp Health")}
              className="p-4"
            >
              <div className="grid grid-cols-2 gap-2.5">
                <FieldInput label="Steps"        name="steps"           placeholder="8500" unit="steps" icon={FootprintsIcon} />
                <FieldInput label="Sleep"        name="sleepHours"      placeholder="7.5"  unit="hrs"   icon={Moon} />
                <FieldInput label="Sleep score"  name="sleepScore"      placeholder="78"   unit="/100"  icon={Moon} />
                <FieldInput label="Resting HR"   name="restingHeartRate" placeholder="58"  unit="bpm"   icon={Heart} />
                <FieldInput label="Live HR"      name="liveHeartRate"   placeholder="72"   unit="bpm"   icon={Heart} />
                <FieldInput label="HRV"          name="hrv"             placeholder="45"   unit="ms"    icon={Zap} />
                <FieldInput label="SpO2"         name="spo2"            placeholder="98"   unit="%"     icon={Activity} />
                <FieldInput label="Stress"       name="stressScore"     placeholder="32"   unit="/100"  icon={Zap} />
              </div>
              <button
                type="submit"
                disabled={loading === "zepp"}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--gradient-iris)] py-2 text-[12.5px] font-medium text-white transition-all hover:opacity-90 disabled:opacity-40"
                style={{ boxShadow: loading !== "zepp" ? "var(--shadow-glow-sm)" : undefined }}
              >
                {loading === "zepp" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                Push to Atlas
              </button>
              {zeppResult && <div className="mt-2"><SyncFeedback status={zeppResult} /></div>}
            </form>
          </div>

          {/* OKOK Scale */}
          <div className="glass-card mb-4 overflow-hidden">
            <div className="flex items-center gap-3 border-b border-white/[0.055] px-4 py-3">
              <div className="flex-1">
                <p className="text-[12.5px] font-medium text-white/80">OKOK Scale</p>
                <p className="text-[11px] text-white/35">Weight · Body fat percentage</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--color-attention)" }} />
                <span className="font-mono text-[9px]" style={{ color: "var(--color-attention)" }}>Manual push</span>
              </div>
            </div>
            <form
              onSubmit={(e) => submit("okok", "/api/sync/okok", e, setOkokResult, "OKOK Scale")}
              className="p-4"
            >
              <div className="grid grid-cols-2 gap-2.5">
                <FieldInput label="Weight"   name="weight"  placeholder="75.5" unit="kg" icon={Scale} />
                <FieldInput label="Body fat" name="bodyFat" placeholder="18.2" unit="%"  icon={Activity} />
              </div>
              <button
                type="submit"
                disabled={loading === "okok"}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-[color-mix(in_oklab,var(--color-healthy)_25%,transparent)] bg-[color-mix(in_oklab,var(--color-healthy)_8%,transparent)] py-2 text-[12.5px] font-medium transition-all hover:opacity-90 disabled:opacity-40"
                style={{ color: "var(--color-healthy)" }}
              >
                {loading === "okok" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Scale className="h-3.5 w-3.5" />}
                Push to Atlas
              </button>
              {okokResult && <div className="mt-2"><SyncFeedback status={okokResult} /></div>}
            </form>
          </div>

          {/* Huawei Health */}
          <div className="glass-card overflow-hidden">
            <div className="flex items-center gap-3 border-b border-white/[0.055] px-4 py-3">
              <div className="flex-1">
                <p className="text-[12.5px] font-medium text-white/80">Huawei Health</p>
                <p className="text-[11px] text-white/35">Steps · Calories · Water · Resting HR</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--color-attention)" }} />
                <span className="font-mono text-[9px]" style={{ color: "var(--color-attention)" }}>Manual push</span>
              </div>
            </div>
            <form
              onSubmit={(e) => submit("huawei", "/api/sync/huawei", e, setHuaweiResult, "Huawei Health")}
              className="p-4"
            >
              <div className="grid grid-cols-2 gap-2.5">
                <FieldInput label="Steps"       name="steps"            placeholder="9200" unit="steps" icon={FootprintsIcon} />
                <FieldInput label="Calories"    name="caloriesBurned"   placeholder="420"  unit="kcal"  icon={Flame} />
                <FieldInput label="Water"       name="waterLiters"      placeholder="2.4"  unit="L"     icon={Droplets} />
                <FieldInput label="Resting HR"  name="restingHeartRate" placeholder="58"   unit="bpm"   icon={Heart} />
              </div>
              <button
                type="submit"
                disabled={loading === "huawei"}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-red-500/20 bg-red-500/6 py-2 text-[12.5px] font-medium text-red-300 transition-all hover:opacity-90 disabled:opacity-40"
              >
                {loading === "huawei" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Heart className="h-3.5 w-3.5" />}
                Push to Atlas
              </button>
              {huaweiResult && <div className="mt-2"><SyncFeedback status={huaweiResult} /></div>}
            </form>
          </div>
        </section>

        <p className="pb-6 text-center atlas-label">
          All data stored locally · No external cloud transmission
        </p>
      </div>
    </>
  );
}
