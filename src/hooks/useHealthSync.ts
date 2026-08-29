import { useState, useCallback, useEffect } from "react";

const API_BASE = "http://localhost:4000";

interface HealthMetricToday {
  restingHeartRate: number;
  liveHeartRate?: number;
  steps: number;
  caloriesBurned: number;
  waterLiters: number;
  sleepHours: number;
  sleepScore: number;
  spo2?: number;
  stressScore?: number;
  hrv?: number;
  recoveryScore?: number;
  macros: Array<{ name: string; value: number; target: number; fill: string }>;
  totalCalories: number;
  macrosPie: Array<{ name: string; value: number; fill: string }>;
  heartRate: Array<{ t: number; bpm: number }>;
  watchSyncedAt?: string;
}

interface UseHealthSyncReturn {
  metric: HealthMetricToday | null;
  weightTrend: Array<{ d: number; w: number }>;
  isLive: boolean;
  isLoading: boolean;
  error: string | null;
  lastSyncedAt: Date | null;
  sendWatchPayload: (payload: Record<string, unknown>) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useHealthSync(): UseHealthSyncReturn {
  const [metric, setMetric] = useState<HealthMetricToday | null>(null);
  const [weightTrend, setWeightTrend] = useState<Array<{ d: number; w: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const fetchMetric = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMetric(data.today);
      setWeightTrend(data.weightTrend ?? []);
      if (data.today?.watchSyncedAt) {
        setLastSyncedAt(new Date(data.today.watchSyncedAt));
      }
      setError(null);
    } catch {
      setError("Backend offline");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendWatchPayload = useCallback(
    async (payload: Record<string, unknown>) => {
      await fetch(`${API_BASE}/api/integrations/zepp/push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {});
      await fetchMetric();
    },
    [fetchMetric],
  );

  useEffect(() => {
    fetchMetric();
    const interval = setInterval(fetchMetric, 30_000);
    return () => clearInterval(interval);
  }, [fetchMetric]);

  const isLive = lastSyncedAt !== null && Date.now() - lastSyncedAt.getTime() < 20 * 60 * 1000;

  return {
    metric,
    weightTrend,
    isLive,
    isLoading,
    error,
    lastSyncedAt,
    sendWatchPayload,
    refetch: fetchMetric,
  };
}
