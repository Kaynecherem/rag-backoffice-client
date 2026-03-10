"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSuperAdminAuth } from "@/lib/superadmin-auth-context";
import { listAuditLogs } from "@/lib/superadmin-api";

interface AuditEntry {
  id: string;
  actor_email: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, unknown>;
  performed_at: string;
}

export default function AuditLogPage() {
  const { user } = useSuperAdminAuth();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");

  const pageSize = 30;

  const loadLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await listAuditLogs(user.token, {
        page,
        page_size: pageSize,
        action: actionFilter || undefined,
      });
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  }, [user, page, actionFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const totalPages = Math.ceil(total / pageSize);

  const formatDetails = (details: Record<string, unknown> | undefined) => {
    if (!details) return null;
    return Object.entries(details)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
      .join(" · ");
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} recorded action{total !== 1 ? "s" : ""}
          </p>
        </div>
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white focus:outline-none focus:border-gray-700 transition-colors self-start"
        >
          <option value="">All actions</option>
          <option value="tenant.create">Tenant created</option>
          <option value="tenant.update">Tenant updated</option>
          <option value="tenant.status_change">Status change</option>
        </select>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  Actor
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Details
                </th>
                <th className="text-right px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  When
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-12">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400 mx-auto" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-sm text-gray-600">
                    No audit entries found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-300 capitalize">
                        {log.action.replace(/\./g, " → ").replace(/_/g, " ")}
                      </span>
                      <div className="text-[11px] text-gray-600 mt-0.5">
                        {log.resource_type}
                        {log.resource_id && (
                          <span className="font-mono ml-1">
                            {log.resource_id.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {log.actor_email}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate hidden md:table-cell">
                      {formatDetails(log.details) || "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-600 whitespace-nowrap">
                      {new Date(log.performed_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <span className="text-xs text-gray-600">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-800 disabled:opacity-30 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-xs border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-800 disabled:opacity-30 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
