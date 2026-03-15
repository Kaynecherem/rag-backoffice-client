"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSuperAdminAuth } from "@/lib/superadmin-auth-context";
import { getPlatformStats, listAuditLogs } from "@/lib/superadmin-api";

interface PlatformStats {
  tenants: { total: number; active: number };
  staff: { total: number };
  policyholders: { total: number };
  documents: { total: number };
  queries: { total: number };
}

interface AuditEntry {
  id: string;
  actor_email: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, unknown>;
  performed_at: string;
}

export default function SuperAdminDashboard() {
  const { user } = useSuperAdminAuth();
  const router = useRouter();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function load() {
      try {
        const [statsData, auditData] = await Promise.all([
          getPlatformStats(user!.token),
          listAuditLogs(user!.token, { page_size: 8 }),
        ]);
        setStats(statsData);
        setRecentActivity(auditData.logs || []);
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
      </div>
    );
  }

  const statCards = stats
    ? [
        { label: "Tenants", value: stats.tenants.total, sub: `${stats.tenants.active} active`, color: "amber" },
        { label: "Staff Users", value: stats.staff.total, color: "blue" },
        { label: "Policyholders", value: stats.policyholders.total, color: "emerald" },
        { label: "Documents", value: stats.documents.total, color: "violet" },
        { label: "Total Queries", value: stats.queries.total, color: "rose" },
      ]
    : [];

  const formatAction = (action: string) => {
    return action.replace(/\./g, " → ").replace(/_/g, " ");
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome back, {user?.name}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
          >
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              {card.label}
            </div>
            <div className="text-2xl font-bold text-white mt-2">
              {card.value.toLocaleString()}
            </div>
            {card.sub && (
              <div className="text-xs text-gray-600 mt-1">{card.sub}</div>
            )}
          </div>
        ))}
      </div>

      {/* Quick actions + recent activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <button
              onClick={() => router.push("/superadmin/tenants")}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <span className="text-amber-400 mr-2">▣</span> Manage Tenants
            </button>
            <button
              onClick={() => router.push("/superadmin/audit")}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <span className="text-amber-400 mr-2">▤</span> View Audit Log
            </button>
          </div>
        </div>

        {/* Recent activity */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-gray-600">No activity yet.</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between gap-4 text-sm"
                >
                  <div className="min-w-0">
                    <span className="text-gray-300 capitalize">
                      {formatAction(entry.action)}
                    </span>
                    {entry.resource_type && (
                      <span className="text-gray-600 ml-1">
                        on {entry.resource_type}
                      </span>
                    )}
                    <div className="text-xs text-gray-600 mt-0.5 truncate">
                      by {entry.actor_email}
                    </div>
                  </div>
                  <span className="text-xs text-gray-600 whitespace-nowrap flex-shrink-0">
                    {timeAgo(entry.performed_at || entry.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
