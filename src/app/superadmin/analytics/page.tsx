"use client";

import React, { useEffect, useState } from "react";
import { useSuperAdminAuth } from "@/lib/superadmin-auth-context";
import { getPlatformAnalytics } from "@/lib/superadmin-api";

// ── Types ───────────────────────────────────────────────────────────────

interface Analytics {
  total_queries: number;
  queries_last_30d: number;
  queries_last_7d: number;
  queries_today: number;
  avg_confidence: number | null;
  avg_latency_ms: number | null;
  queries_by_day: Array<{ date: string; count: number }>;
  queries_by_user_type: Array<{ user_type: string; count: number }>;
  queries_by_document_type: Array<{ document_type: string; count: number }>;
  top_tenants: Array<{ tenant_id: string; tenant_name: string; count: number }>;
}

// ── Simple Bar Chart ────────────────────────────────────────────────────

function BarChart({ data, maxBars = 30 }: { data: Array<{ label: string; value: number }>; maxBars?: number }) {
  const sliced = data.slice(-maxBars);
  const maxVal = Math.max(...sliced.map((d) => d.value), 1);

  return (
    <div className="flex items-end gap-[2px] h-32">
      {sliced.map((d, i) => {
        const height = (d.value / maxVal) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
            <div
              className="w-full bg-accent/70 rounded-t-sm transition-all hover:bg-accent min-h-[2px]"
              style={{ height: `${Math.max(height, 2)}%` }}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-surface border border-input-border rounded px-2 py-1 text-[10px] text-heading whitespace-nowrap z-10 shadow-lg">
              {d.label}: {d.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Horizontal Bar Chart ────────────────────────────────────────────────

function HorizontalBar({ items, colorClass = "bg-accent" }: { items: Array<{ label: string; value: number }>; colorClass?: string }) {
  const maxVal = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-body truncate mr-2">{item.label}</span>
            <span className="text-muted flex-shrink-0">{item.value.toLocaleString()}</span>
          </div>
          <div className="h-2 bg-surface rounded-full overflow-hidden">
            <div
              className={`h-full ${colorClass} rounded-full transition-all`}
              style={{ width: `${(item.value / maxVal) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════

export default function AnalyticsPage() {
  const { user } = useSuperAdminAuth();
  const [data, setData] = useState<Analytics | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getPlatformAnalytics(user.token, days)
      .then(setData)
      .catch((err) => console.error("Analytics error:", err))
      .finally(() => setLoading(false));
  }, [user, days]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  if (!data) {
    return <div className="p-6 text-muted">Failed to load analytics.</div>;
  }

  const chartData = data.queries_by_day.map((d) => ({
    label: d.date,
    value: d.count,
  }));

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-heading">Analytics</h1>
          <p className="text-sm text-muted mt-1">Platform-wide query and usage data</p>
        </div>
        <div className="flex gap-1 bg-card rounded-lg p-1 self-start">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                days === d ? "bg-surface text-heading" : "text-muted hover:text-body"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: "Total Queries", value: data.total_queries.toLocaleString() },
          { label: "Last 30 Days", value: data.queries_last_30d.toLocaleString() },
          { label: "Last 7 Days", value: data.queries_last_7d.toLocaleString() },
          { label: "Today", value: data.queries_today.toLocaleString() },
          { label: "Avg Confidence", value: data.avg_confidence ? `${(data.avg_confidence * 100).toFixed(1)}%` : "—" },
          { label: "Avg Latency", value: data.avg_latency_ms ? `${data.avg_latency_ms.toFixed(0)}ms` : "—" },
        ].map((card) => (
          <div key={card.label} className="bg-card border border-border-default rounded-xl p-4">
            <div className="text-[11px] text-muted uppercase tracking-wider">{card.label}</div>
            <div className="text-xl font-bold text-heading mt-2">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Queries over time */}
        <div className="bg-card border border-border-default rounded-xl p-5">
          <h2 className="text-sm font-semibold text-heading mb-4">Queries Over Time</h2>
          {chartData.length > 0 ? (
            <div>
              <BarChart data={chartData} />
              <div className="flex justify-between mt-2 text-[10px] text-faint">
                <span>{chartData[0]?.label}</span>
                <span>{chartData[chartData.length - 1]?.label}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-faint py-8 text-center">No query data for this period.</p>
          )}
        </div>

        {/* Top tenants */}
        <div className="bg-card border border-border-default rounded-xl p-5">
          <h2 className="text-sm font-semibold text-heading mb-4">Top Tenants</h2>
          {data.top_tenants.length > 0 ? (
            <HorizontalBar
              items={data.top_tenants.map((t) => ({ label: t.tenant_name, value: t.count }))}
            />
          ) : (
            <p className="text-sm text-faint py-8 text-center">No tenant data yet.</p>
          )}
        </div>

        {/* By user type */}
        <div className="bg-card border border-border-default rounded-xl p-5">
          <h2 className="text-sm font-semibold text-heading mb-4">Queries by User Type</h2>
          {data.queries_by_user_type.length > 0 ? (
            <div className="space-y-3">
              {data.queries_by_user_type.map((item) => {
                const total = data.queries_by_user_type.reduce((s, i) => s + i.count, 0);
                const pct = total > 0 ? ((item.count / total) * 100).toFixed(1) : "0";
                return (
                  <div key={item.user_type} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        item.user_type === "policyholder" ? "bg-emerald-400" :
                        item.user_type === "staff" ? "bg-blue-400" : "bg-accent"
                      }`} />
                      <span className="text-sm text-body capitalize">{item.user_type}</span>
                    </div>
                    <span className="text-sm text-secondary">
                      {item.count.toLocaleString()} <span className="text-faint">({pct}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-faint py-8 text-center">No data yet.</p>
          )}
        </div>

        {/* By document type */}
        <div className="bg-card border border-border-default rounded-xl p-5">
          <h2 className="text-sm font-semibold text-heading mb-4">Queries by Document Type</h2>
          {data.queries_by_document_type.length > 0 ? (
            <div className="space-y-3">
              {data.queries_by_document_type.map((item) => {
                const total = data.queries_by_document_type.reduce((s, i) => s + i.count, 0);
                const pct = total > 0 ? ((item.count / total) * 100).toFixed(1) : "0";
                return (
                  <div key={item.document_type} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        item.document_type === "policy" ? "bg-violet-400" : "bg-cyan-400"
                      }`} />
                      <span className="text-sm text-body capitalize">{item.document_type}</span>
                    </div>
                    <span className="text-sm text-secondary">
                      {item.count.toLocaleString()} <span className="text-faint">({pct}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-faint py-8 text-center">No data yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
