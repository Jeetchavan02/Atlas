import { useState, useCallback, useEffect } from "react";

const API_BASE = "http://localhost:4000";

interface GmailAlert {
  _id: string;
  messageId: string;
  subject: string;
  sender: string;
  senderEmail: string;
  snippet: string;
  receivedAt: string;
  priority: "critical" | "high" | "medium";
  priorityScore: number;
  keywords: string[];
  isRead: boolean;
}

interface UseGmailAlertsReturn {
  alerts: GmailAlert[];
  totalUnread: number;
  isLoading: boolean;
  error: string | null;
  markRead: (messageId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useGmailAlerts(): UseGmailAlertsReturn {
  const [alerts, setAlerts] = useState<GmailAlert[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/integrations/gmail`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAlerts(data.alerts ?? []);
      setTotalUnread(data.totalUnread ?? 0);
      setError(null);
    } catch {
      setError("Backend offline");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markRead = useCallback(async (messageId: string) => {
    setAlerts((prev) => prev.filter((a) => a.messageId !== messageId));
    setTotalUnread((n) => Math.max(0, n - 1));
    await fetch(`${API_BASE}/api/integrations/gmail/mark-read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId }),
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60_000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  return { alerts, totalUnread, isLoading, error, markRead, refetch: fetchAlerts };
}
