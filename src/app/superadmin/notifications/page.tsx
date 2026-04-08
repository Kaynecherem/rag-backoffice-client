"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSuperAdminAuth } from "@/lib/superadmin-auth-context";
import { listNotifications, createNotification, toggleNotification, deleteNotification } from "@/lib/superadmin-api";

interface NotifItem {
  id: string; title: string; message: string; notification_type: string;
  target: string; target_tenant_id: string | null; is_active: boolean;
  created_by: string; created_at: string; scheduled_at: string | null;
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-overlay/60" onClick={onClose} />
      <div className="relative bg-card border border-border-default rounded-xl w-full max-w-md mx-4 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-heading">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-body text-lg">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const TYPE_COLORS: Record<string, string> = {
  announcement: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  maintenance: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  alert: "bg-red-400/10 text-red-400 border-red-400/20",
  onboarding: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
};

export default function NotificationsPage() {
  const { user } = useSuperAdminAuth();
  const [notifs, setNotifs] = useState<NotifItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", message: "", notification_type: "announcement", target: "all" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const pageSize = 15;
  const totalPages = Math.ceil(total / pageSize);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await listNotifications(user.token, { page, page_size: pageSize, notification_type: typeFilter || undefined });
      setNotifs(data.notifications); setTotal(data.total);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [user, page, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true); setError("");
    try {
      await createNotification(user.token, form);
      setShowCreate(false); setForm({ title: "", message: "", notification_type: "announcement", target: "all" });
      load();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  };

  const handleToggle = async (id: string) => {
    if (!user) return;
    await toggleNotification(user.token, id); load();
  };

  const handleDelete = async (id: string, title: string) => {
    if (!user || !confirm(`Delete "${title}"?`)) return;
    await deleteNotification(user.token, id); load();
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-heading">Notifications</h1>
          <p className="text-sm text-muted mt-1">{total} notification{total !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 bg-accent text-on-accent text-sm font-semibold rounded-lg hover:bg-accent-hover self-start">+ New</button>
      </div>

      <div className="flex gap-3 mb-5">
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 bg-card border border-border-default rounded-lg text-sm text-heading focus:outline-none focus:border-input-border">
          <option value="">All types</option>
          <option value="announcement">Announcement</option>
          <option value="maintenance">Maintenance</option>
          <option value="alert">Alert</option>
          <option value="onboarding">Onboarding</option>
        </select>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent" /></div>
        ) : notifs.length === 0 ? (
          <p className="text-center py-12 text-sm text-faint">No notifications found.</p>
        ) : notifs.map((n) => (
          <div key={n.id} className={`bg-card border border-border-default rounded-xl p-4 ${!n.is_active ? "opacity-50" : ""}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded-full border ${TYPE_COLORS[n.notification_type] || "bg-surface text-secondary border-input-border"}`}>{n.notification_type}</span>
                  {!n.is_active && <span className="text-[11px] text-faint">(inactive)</span>}
                </div>
                <h3 className="text-sm font-medium text-heading">{n.title}</h3>
                <p className="text-xs text-secondary mt-1 line-clamp-2">{n.message}</p>
                <div className="text-[10px] text-faint mt-2">by {n.created_by} · {new Date(n.created_at).toLocaleString()}</div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => handleToggle(n.id)} className="px-2 py-1 text-[11px] text-secondary border border-input-border rounded hover:bg-surface">
                  {n.is_active ? "Disable" : "Enable"}
                </button>
                <button onClick={() => handleDelete(n.id, n.title)} className="px-2 py-1 text-[11px] text-red-400 border border-red-400/30 rounded hover:bg-red-400/10">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-faint">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 text-xs border border-input-border text-secondary rounded-lg hover:bg-surface disabled:opacity-30">Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1.5 text-xs border border-input-border text-secondary rounded-lg hover:bg-surface disabled:opacity-30">Next</button>
          </div>
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Notification">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-secondary mb-1.5">Title</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="w-full px-3 py-2.5 bg-surface border border-input-border rounded-lg text-sm text-heading focus:outline-none focus:border-accent/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1.5">Message</label>
            <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required rows={4} className="w-full px-3 py-2.5 bg-surface border border-input-border rounded-lg text-sm text-heading focus:outline-none focus:border-accent/50 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Type</label>
              <select value={form.notification_type} onChange={(e) => setForm({ ...form, notification_type: e.target.value })} className="w-full px-3 py-2.5 bg-surface border border-input-border rounded-lg text-sm text-heading focus:outline-none focus:border-accent/50">
                <option value="announcement">Announcement</option>
                <option value="maintenance">Maintenance</option>
                <option value="alert">Alert</option>
                <option value="onboarding">Onboarding</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Target</label>
              <select value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} className="w-full px-3 py-2.5 bg-surface border border-input-border rounded-lg text-sm text-heading focus:outline-none focus:border-accent/50">
                <option value="all">All Tenants</option>
                <option value="tenant">Specific Tenant</option>
              </select>
            </div>
          </div>
          {error && <div className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border border-input-border text-secondary text-sm rounded-lg hover:bg-surface">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-accent text-on-accent text-sm font-semibold rounded-lg hover:bg-accent-hover disabled:opacity-50">{saving ? "Creating..." : "Create"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
