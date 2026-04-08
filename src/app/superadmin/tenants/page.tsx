"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSuperAdminAuth } from "@/lib/superadmin-auth-context";
import { listTenants, createTenant } from "@/lib/superadmin-api";

// ── Types ───────────────────────────────────────────────────────────────

interface TenantItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  staff_count: number;
  policyholder_count: number;
  document_count: number;
  query_count: number;
}

// ── Status Badge ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
    trial: "bg-amber-400/10 text-amber-400 border-amber-400/20",
    suspended: "bg-red-400/10 text-red-400 border-red-400/20",
  };
  return (
      <span className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded-full border ${styles[status] || "bg-surface text-secondary border-input-border"}`}>
      {status}
    </span>
  );
}

// ── Create Tenant Modal ─────────────────────────────────────────────────

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

function CreateTenantModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { user } = useSuperAdminAuth();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState("trial");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 100));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError("");
    setSaving(true);
    try {
      await createTenant(user.token, { name: name.trim(), slug: slug.trim(), status });
      setName(""); setSlug(""); setStatus("trial");
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create tenant");
    } finally { setSaving(false); }
  };

  return (
      <Modal open={open} onClose={onClose} title="New Tenant">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-secondary mb-1.5">Agency Name</label>
            <input type="text" value={name} onChange={(e) => handleNameChange(e.target.value)} required className="w-full px-3 py-2.5 bg-surface border border-input-border rounded-lg text-sm text-heading focus:outline-none focus:border-accent/50" placeholder="Acme Insurance Agency" />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1.5">Slug</label>
            <input type="text" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} required pattern="^[a-z0-9\-]+$" className="w-full px-3 py-2.5 bg-surface border border-input-border rounded-lg text-sm text-heading font-mono focus:outline-none focus:border-accent/50" placeholder="acme-insurance" />
            <p className="text-[11px] text-faint mt-1">Lowercase letters, numbers, and hyphens only</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1.5">Initial Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-2.5 bg-surface border border-input-border rounded-lg text-sm text-heading focus:outline-none focus:border-accent/50">
              <option value="trial">Trial</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          {error && <div className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-input-border text-secondary text-sm rounded-lg hover:bg-surface">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-accent text-on-accent text-sm font-semibold rounded-lg hover:bg-accent-hover disabled:opacity-50">{saving ? "Creating..." : "Create Tenant"}</button>
          </div>
        </form>
      </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════

export default function TenantsPage() {
  const { user } = useSuperAdminAuth();
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);

  const pageSize = 15;

  const loadTenants = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await listTenants(user.token, { page, page_size: pageSize, status: statusFilter || undefined, search: search || undefined });
      setTenants(data.tenants);
      setTotal(data.total);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [user, page, statusFilter, search]);

  useEffect(() => { loadTenants(); }, [loadTenants]);

  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const totalPages = Math.ceil(total / pageSize);

  return (
      <div className="p-6 lg:p-8 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-heading">Tenants</h1>
            <p className="text-sm text-muted mt-1">{total} total tenant{total !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 bg-accent text-on-accent text-sm font-semibold rounded-lg hover:bg-accent-hover self-start">+ New Tenant</button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search tenants..." className="flex-1 px-3 py-2.5 bg-card border border-border-default rounded-lg text-sm text-heading placeholder-muted focus:outline-none focus:border-input-border" />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2.5 bg-card border border-border-default rounded-lg text-sm text-heading focus:outline-none focus:border-input-border">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        <div className="bg-card border border-border-default rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
              <tr className="border-b border-border-default">
                <th className="text-left px-4 py-3 text-[11px] font-medium text-muted uppercase tracking-wider">Tenant</th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-muted uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 text-[11px] font-medium text-muted uppercase tracking-wider hidden md:table-cell">Staff</th>
                <th className="text-right px-4 py-3 text-[11px] font-medium text-muted uppercase tracking-wider hidden md:table-cell">Policyholders</th>
                <th className="text-right px-4 py-3 text-[11px] font-medium text-muted uppercase tracking-wider hidden lg:table-cell">Docs</th>
                <th className="text-right px-4 py-3 text-[11px] font-medium text-muted uppercase tracking-wider hidden lg:table-cell">Queries</th>
                <th className="text-right px-4 py-3 text-[11px] font-medium text-muted uppercase tracking-wider hidden sm:table-cell">Created</th>
              </tr>
              </thead>
              <tbody>
              {loading ? (
                  <tr><td colSpan={7} className="text-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent mx-auto" /></td></tr>
              ) : tenants.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-sm text-faint">{search || statusFilter ? "No tenants match your filters." : "No tenants yet. Create one to get started."}</td></tr>
              ) : tenants.map((t) => (
                  <tr key={t.id} onClick={() => router.push(`/superadmin/tenants/${t.id}`)} className="border-b border-border-default/50 hover:bg-surface/30 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-heading">{t.name}</div>
                      <div className="text-[11px] text-faint font-mono">{t.slug}</div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-3 text-right text-sm text-secondary hidden md:table-cell">{t.staff_count}</td>
                    <td className="px-4 py-3 text-right text-sm text-secondary hidden md:table-cell">{t.policyholder_count}</td>
                    <td className="px-4 py-3 text-right text-sm text-secondary hidden lg:table-cell">{t.document_count}</td>
                    <td className="px-4 py-3 text-right text-sm text-secondary hidden lg:table-cell">{t.query_count}</td>
                    <td className="px-4 py-3 text-right text-xs text-faint hidden sm:table-cell">{new Date(t.created_at).toLocaleDateString()}</td>
                  </tr>
              ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border-default">
                <span className="text-xs text-faint">Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 text-xs border border-input-border text-secondary rounded-lg hover:bg-surface disabled:opacity-30">Previous</button>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1.5 text-xs border border-input-border text-secondary rounded-lg hover:bg-surface disabled:opacity-30">Next</button>
                </div>
              </div>
          )}
        </div>

        <CreateTenantModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={loadTenants} />
      </div>
  );
}
