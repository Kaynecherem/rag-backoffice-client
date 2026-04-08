"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSuperAdminAuth } from "@/lib/superadmin-auth-context";
import { getSystemHealth } from "@/lib/superadmin-api";

interface ServiceStatus {
  name: string;
  status: string;
  latency_ms: number | null;
  details: string | null;
}

interface HealthData {
  overall: string;
  uptime_seconds: number | null;
  services: ServiceStatus[];
  checked_at: string;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function SystemHealthPage() {
  const { user } = useSuperAdminAuth();
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHealth = useCallback(async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const result = await getSystemHealth(user.token);
      setData(result);
    } catch (err) {
      console.error("Health check failed:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { loadHealth(); }, [loadHealth]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => loadHealth(true), 30000);
    return () => clearInterval(interval);
  }, [loadHealth]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  const statusColors: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    ok: { bg: "bg-emerald-400/10", text: "text-emerald-400", border: "border-emerald-400/20", dot: "bg-emerald-400" },
    healthy: { bg: "bg-emerald-400/10", text: "text-emerald-400", border: "border-emerald-400/20", dot: "bg-emerald-400" },
    degraded: { bg: "bg-amber-400/10", text: "text-amber-400", border: "border-amber-400/20", dot: "bg-amber-400" },
    down: { bg: "bg-red-400/10", text: "text-red-400", border: "border-red-400/20", dot: "bg-red-400" },
    unhealthy: { bg: "bg-red-400/10", text: "text-red-400", border: "border-red-400/20", dot: "bg-red-400" },
  };

  const overallStyle = statusColors[data?.overall || ""] || statusColors.down;

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-heading">System Health</h1>
          <p className="text-sm text-muted mt-1">
            {data?.checked_at ? `Last checked: ${new Date(data.checked_at).toLocaleTimeString()}` : ""}
            {refreshing && <span className="ml-2 text-accent">Refreshing...</span>}
          </p>
        </div>
        <button
          onClick={() => loadHealth(true)}
          disabled={refreshing}
          className="px-4 py-2.5 border border-input-border text-body text-sm rounded-lg hover:bg-surface disabled:opacity-50 self-start"
        >
          Refresh
        </button>
      </div>

      {/* Overall status */}
      {data && (
        <div className={`${overallStyle.bg} border ${overallStyle.border} rounded-xl p-5 mb-6`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${overallStyle.dot} ${data.overall === "healthy" ? "animate-pulse" : ""}`} />
            <span className={`text-lg font-semibold ${overallStyle.text} capitalize`}>{data.overall}</span>
          </div>
          {data.uptime_seconds && (
            <p className="text-sm text-muted mt-2">
              Uptime: {formatUptime(data.uptime_seconds)}
            </p>
          )}
        </div>
      )}

      {/* Service cards */}
      <div className="space-y-3">
        {data?.services.map((service) => {
          const style = statusColors[service.status] || statusColors.down;
          return (
            <div
              key={service.name}
              className="bg-card border border-border-default rounded-xl p-5 hover:border-input-border transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                  <h3 className="text-sm font-semibold text-heading">{service.name}</h3>
                </div>
                <div className="flex items-center gap-3">
                  {service.latency_ms !== null && (
                    <span className="text-xs text-muted">
                      {service.latency_ms.toFixed(1)}ms
                    </span>
                  )}
                  <span className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded-full border ${style.bg} ${style.text} ${style.border}`}>
                    {service.status}
                  </span>
                </div>
              </div>
              {service.details && (
                <p className="text-xs text-muted leading-relaxed">{service.details}</p>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-faint mt-6">
        Auto-refreshes every 30 seconds.
      </p>
    </div>
  );
}
