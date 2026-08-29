import { useState, useCallback, useEffect } from "react";

const API_BASE = "http://localhost:4000";

interface ZeppStatus {
  isLive: boolean;
  lastSync: string | null;
  deviceModel: string;
  source: string | null;
  dataTypes: string[];
  liveHeartRate: number | null;
  steps: number;
  recoveryScore: number | null;
  spo2: number | null;
  stressScore: number | null;
}

interface UseZeppSyncReturn {
  status: ZeppStatus | null;
  isLoading: boolean;
  error: string | null;
  triggerMockSync: () => Promise<void>;
  refetch: () => Promise<void>;
}

const DEFAULT_STATUS: ZeppStatus = {
  isLive: false,
  lastSync: null,
  deviceModel: "Amazfit Bip 6",
  source: null,
  dataTypes: [],
  liveHeartRate: null,
  steps: 0,
  recoveryScore: null,
  spo2: null,
  stressScore: null,
};

export function useZeppSync(): UseZeppSyncReturn {
  const [status, setStatus] = useState<ZeppStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/integrations/zepp/status`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStatus(data);
      setError(null);
    } catch {
      setStatus(DEFAULT_STATUS);
      setError("Backend offline");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const triggerMockSync = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/integrations/zepp/trigger-mock`, {
        method: "POST",
      });
      await fetchStatus();
    } catch {
      // silent — backend might be offline
    }
  }, [fetchStatus]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5 * 60 * 1000); // every 5 min
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return { status, isLoading, error, triggerMockSync, refetch: fetchStatus };
}
