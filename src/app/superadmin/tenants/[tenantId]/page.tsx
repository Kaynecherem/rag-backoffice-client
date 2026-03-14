"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSuperAdminAuth } from "@/lib/superadmin-auth-context";
import {
  getTenant,
  listStaff,
  createStaff,
  updateStaff,
  updateStaffStatus,
  listPolicyholders,
  createPolicyholder,
  updatePolicyholder,
  updatePolicyholderStatus,
  bulkImportPolicyholders,
  listDocuments,
  getDocumentStats,
  getDocument,
  deleteDocument,
  getWidgetConfig,
  updateWidgetConfig,
  resetWidgetConfig,
  impersonateStaff,
  impersonatePolicyholder,
  getOnboardingStatus,
  updateOnboardingStep,
  getDisclaimer,
  updateDisclaimer,
  getTenantUsage,
  assignPlan,
  listPlans,
  deleteStaff,
  resetStaffPassword,
} from "@/lib/superadmin-api";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface TenantData {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  staff_count: number;
  policyholder_count: number;
  policy_count: number;
  communication_count: number;
  query_count: number;
  recent_queries: Array<{ id: string; question: string; user_type: string; queried_at: string }>;
}

interface StaffItem {
  id: string;
  email: string;
  name: string | null;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

interface PHItem {
  id: string;
  policy_number: string;
  last_name: string | null;
  company_name: string | null;
  is_active: boolean;
  created_at: string;
  query_count: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Shared Components
// ═══════════════════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
    trial: "bg-amber-400/10 text-amber-400 border-amber-400/20",
    suspended: "bg-red-400/10 text-red-400 border-red-400/20",
  };
  return (
      <span className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded-full border ${styles[status] || "bg-gray-800 text-gray-400 border-gray-700"}`}>
      {status}
    </span>
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
      <span className="inline-block px-2 py-0.5 text-[11px] font-medium rounded-full border bg-emerald-400/10 text-emerald-400 border-emerald-400/20">active</span>
  ) : (
      <span className="inline-block px-2 py-0.5 text-[11px] font-medium rounded-full border bg-gray-800 text-gray-500 border-gray-700">inactive</span>
  );
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />
        <div className="relative bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md mx-4 p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg">✕</button>
          </div>
          {children}
        </div>
      </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
      <div className="bg-gray-800/50 rounded-lg p-3">
        <div className="text-[11px] text-gray-500 uppercase tracking-wider">{label}</div>
        <div className="text-xl font-bold text-white mt-1">{value.toLocaleString()}</div>
      </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Overview Tab
// ═══════════════════════════════════════════════════════════════════════════

function OverviewTab({ tenant }: { tenant: TenantData }) {
  return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard label="Staff" value={tenant.staff_count} />
          <StatCard label="Policyholders" value={tenant.policyholder_count} />
          <StatCard label="Policies" value={tenant.policy_count} />
          <StatCard label="Communications" value={tenant.communication_count} />
          <StatCard label="Total Queries" value={tenant.query_count} />
        </div>
        {tenant.recent_queries.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-gray-400 mb-3">Recent Queries</h3>
              <div className="space-y-2">
                {tenant.recent_queries.map((q) => (
                    <div key={q.id} className="bg-gray-800/50 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-300 line-clamp-2">{q.question}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-600">
                        <span>{q.user_type}</span>
                        <span>·</span>
                        <span>{new Date(q.queried_at).toLocaleString()}</span>
                      </div>
                    </div>
                ))}
              </div>
            </div>
        )}
      </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Staff Tab
// ═══════════════════════════════════════════════════════════════════════════

function StaffTab({ tenantId }: { tenantId: string }) {
  const { user } = useSuperAdminAuth();
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: "", email: "", role: "staff" });
  const [createData, setCreateData] = useState({ name: "", email: "", role: "staff" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [passwordLink, setPasswordLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const pageSize = 15;

  const loadStaff = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await listStaff(user.token, tenantId, { page, page_size: pageSize, search: search || undefined });
      setStaff(data.staff);
      setTotal(data.total);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [user, tenantId, page, search]);

  const handleDeleteStaff = async (staffId: string, name: string | null) => {
    if (!confirm(`Permanently delete "${name}"? This will remove their Auth0 account. Their history entries will show as "(Deleted User)".`)) {
      return;
    }
    try {
      await deleteStaff(user!.token, tenantId, staffId);
      loadStaff();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const [resetLink, setResetLink] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);

  const handleResetPassword = async (staffId: string, email: string) => {
    try {
      const result = await resetStaffPassword(user!.token, tenantId, staffId);
      setResetLink(result.password_reset_url);
      setResetEmail(email);
      setShowResetModal(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => { loadStaff(); }, [loadStaff]);
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError("");
    setPasswordLink(null);
    setCopied(false);
    try {
      const result = await createStaff(user.token, tenantId, createData);
      loadStaff();
      if (result.password_reset_url) {
        setPasswordLink(result.password_reset_url);
      } else {
        setShowCreate(false);
        setCreateData({ name: "", email: "", role: "staff" });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally { setSaving(false); }
  };

  const handleCloseCreateModal = () => {
    setShowCreate(false);
    setPasswordLink(null);
    setCopied(false);
    setCreateData({ name: "", email: "", role: "staff" });
    setError("");
  };

  const handleCopyLink = () => {
    if (passwordLink) {
      navigator.clipboard.writeText(passwordLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveEdit = async (staffId: string) => {
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      await updateStaff(user.token, tenantId, staffId, editData);
      setEditingId(null);
      loadStaff();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally { setSaving(false); }
  };

  const handleToggleStatus = async (s: StaffItem) => {
    if (!user) return;
    try {
      await updateStaffStatus(user.token, tenantId, s.id, !s.is_active);
      loadStaff();
    } catch (err) { console.error(err); }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name or email..."
              className="flex-1 px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-600"
          />
          <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 bg-amber-400 text-gray-950 text-sm font-semibold rounded-lg hover:bg-amber-300 self-start">
            + Add Staff
          </button>
        </div>

        {error && <div className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</div>}

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Role</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Status</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Last Login</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
            </thead>
            <tbody>
            {loading ? (
                <tr><td colSpan={5} className="text-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400 mx-auto" /></td></tr>
            ) : staff.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-sm text-gray-600">No staff users found.</td></tr>
            ) : (
                staff.map((s) => (
                    <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                      <td className="px-4 py-3">
                        {editingId === s.id ? (
                            <div className="space-y-1">
                              <input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white" placeholder="Name" />
                              <input value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white" placeholder="Email" />
                            </div>
                        ) : (
                            <>
                              <div className="text-sm font-medium text-white">{s.name || "—"}</div>
                              <div className="text-[11px] text-gray-500">{s.email}</div>
                            </>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {editingId === s.id ? (
                            <select value={editData.role} onChange={(e) => setEditData({ ...editData, role: e.target.value })} className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white">
                              <option value="staff">Staff</option>
                              <option value="admin">Admin</option>
                            </select>
                        ) : (
                            <span className={`text-xs font-medium ${s.role === "admin" ? "text-amber-400" : "text-gray-400"}`}>{s.role}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell"><ActiveBadge active={s.is_active} /></td>
                      <td className="px-4 py-3 text-xs text-gray-600 hidden lg:table-cell">
                        {s.last_login_at ? new Date(s.last_login_at).toLocaleDateString() : "Never"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {editingId === s.id ? (
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => setEditingId(null)} className="px-2 py-1 text-[11px] text-gray-400 border border-gray-700 rounded hover:bg-gray-800">Cancel</button>
                              <button onClick={() => handleSaveEdit(s.id)} disabled={saving} className="px-2 py-1 text-[11px] bg-amber-400 text-gray-950 font-medium rounded hover:bg-amber-300 disabled:opacity-50">Save</button>
                            </div>
                        ) : (
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => handleResetPassword(s.id, s.email)} className="px-2 py-1 text-[11px] text-blue-400 border border-blue-400/30 rounded hover:bg-blue-400/10">Reset PW</button>
                              <button onClick={() => { setEditingId(s.id); setEditData({ name: s.name || "", email: s.email, role: s.role }); setError(""); }} className="px-2 py-1 text-[11px] text-gray-400 border border-gray-700 rounded hover:bg-gray-800">Edit</button>
                              <button onClick={() => handleToggleStatus(s)} className={`px-2 py-1 text-[11px] rounded border ${s.is_active ? "text-red-400 border-red-400/30 hover:bg-red-400/10" : "text-emerald-400 border-emerald-400/30 hover:bg-emerald-400/10"}`}>
                                {s.is_active ? "Deactivate" : "Activate"}
                              </button>
                              <button onClick={() => handleDeleteStaff(s.id, s.name)} className="px-2 py-1 text-[11px] text-red-400 border border-red-400/30 rounded hover:bg-red-400/10">Delete</button>
                            </div>
                        )}
                      </td>
                    </tr>
                ))
            )}
            </tbody>
          </table>
          {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
                <span className="text-xs text-gray-600">Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 text-xs border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-800 disabled:opacity-30">Prev</button>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1.5 text-xs border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-800 disabled:opacity-30">Next</button>
                </div>
              </div>
          )}
        </div>

        {/* Create Staff Modal — switches between form and password link */}
        <Modal open={showCreate} onClose={handleCloseCreateModal} title={passwordLink ? "Staff User Created" : "Add Staff User"}>
          {passwordLink ? (
              <div className="space-y-4">
                <div className="text-sm text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-lg px-3 py-2">
                  User created successfully. Share this link with them to set their password:
                </div>
                <div className="relative">
                  <pre className="bg-gray-800/50 rounded-lg p-3 text-[11px] text-gray-300 font-mono break-all overflow-x-auto max-h-24">{passwordLink}</pre>
                  <button
                      onClick={handleCopyLink}
                      className="absolute top-2 right-2 px-2 py-1 text-[11px] text-amber-400 border border-amber-400/30 rounded hover:bg-amber-400/10"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="text-[11px] text-gray-500">This link expires in 7 days. The user can set their password and then log in immediately.</p>
                <button
                    onClick={handleCloseCreateModal}
                    className="w-full py-2.5 bg-amber-400 text-gray-950 text-sm font-semibold rounded-lg hover:bg-amber-300"
                >
                  Done
                </button>
              </div>
          ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                {error && <div className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</div>}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Name</label>
                  <input type="text" value={createData.name} onChange={(e) => setCreateData({ ...createData, name: e.target.value })} required className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400/50" placeholder="Jane Smith" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
                  <input type="email" value={createData.email} onChange={(e) => setCreateData({ ...createData, email: e.target.value })} required className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400/50" placeholder="jane@agency.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Role</label>
                  <select value={createData.role} onChange={(e) => setCreateData({ ...createData, role: e.target.value })} className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400/50">
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={handleCloseCreateModal} className="flex-1 py-2.5 border border-gray-700 text-gray-400 text-sm rounded-lg hover:bg-gray-800">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-amber-400 text-gray-950 text-sm font-semibold rounded-lg hover:bg-amber-300 disabled:opacity-50">{saving ? "Creating..." : "Add Staff"}</button>
                </div>
              </form>
          )}
        </Modal>
        <Modal open={showResetModal} onClose={() => { setShowResetModal(false); setResetLink(null); setResetEmail(null); }} title="Password Reset Link">
          <div className="space-y-4">
            <div className="text-sm text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-lg px-3 py-2">
              Password reset link generated for <strong>{resetEmail}</strong>:
            </div>
            <div className="relative">
              <pre className="bg-gray-800/50 rounded-lg p-3 text-[11px] text-gray-300 font-mono break-all overflow-x-auto max-h-24">{resetLink}</pre>
              <button
                  onClick={() => { if (resetLink) { navigator.clipboard.writeText(resetLink); } }}
                  className="absolute top-2 right-2 px-2 py-1 text-[11px] text-amber-400 border border-amber-400/30 rounded hover:bg-amber-400/10"
              >
                Copy
              </button>
            </div>
            <p className="text-[11px] text-gray-500">This link expires in 7 days.</p>
            <button onClick={() => { setShowResetModal(false); setResetLink(null); setResetEmail(null); }} className="w-full py-2.5 bg-amber-400 text-gray-950 text-sm font-semibold rounded-lg hover:bg-amber-300">Done</button>
          </div>
        </Modal>
      </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Policyholders Tab
// ═══════════════════════════════════════════════════════════════════════════

function PolicyholdersTab({ tenantId }: { tenantId: string }) {
  const { user } = useSuperAdminAuth();
  const [phs, setPhs] = useState<PHItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ policy_number: "", last_name: "", company_name: "" });
  const [createData, setCreateData] = useState({ policy_number: "", last_name: "", company_name: "" });
  const [bulkText, setBulkText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [bulkResult, setBulkResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);

  const pageSize = 15;

  const loadPHs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await listPolicyholders(user.token, tenantId, { page, page_size: pageSize, search: search || undefined });
      setPhs(data.policyholders);
      setTotal(data.total);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [user, tenantId, page, search]);

  useEffect(() => { loadPHs(); }, [loadPHs]);
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      await createPolicyholder(user.token, tenantId, {
        policy_number: createData.policy_number,
        last_name: createData.last_name || undefined,
        company_name: createData.company_name || undefined,
      });
      setShowCreate(false);
      setCreateData({ policy_number: "", last_name: "", company_name: "" });
      loadPHs();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally { setSaving(false); }
  };

  const handleSaveEdit = async (phId: string) => {
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      await updatePolicyholder(user.token, tenantId, phId, editData);
      setEditingId(null);
      loadPHs();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally { setSaving(false); }
  };

  const handleToggleStatus = async (ph: PHItem) => {
    if (!user) return;
    try {
      await updatePolicyholderStatus(user.token, tenantId, ph.id, !ph.is_active);
      loadPHs();
    } catch (err) { console.error(err); }
  };

  const handleBulkImport = async () => {
    if (!user || !bulkText.trim()) return;
    setSaving(true);
    setError("");
    setBulkResult(null);
    try {
      const lines = bulkText.trim().split("\n").filter((l) => l.trim());
      const items = lines.map((line) => {
        const parts = line.split(",").map((p) => p.trim());
        return {
          policy_number: parts[0] || "",
          last_name: parts[1] || undefined,
          company_name: parts[2] || undefined,
        };
      }).filter((item) => item.policy_number);

      if (items.length === 0) {
        setError("No valid rows found. Format: policy_number,last_name,company_name");
        return;
      }

      const result = await bulkImportPolicyholders(user.token, tenantId, items);
      setBulkResult(result);
      if (result.created > 0) loadPHs();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally { setSaving(false); }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search by policy #, last name, or company..." className="flex-1 px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-600" />
          <div className="flex gap-2 self-start">
            <button onClick={() => setShowBulkImport(true)} className="px-4 py-2.5 border border-gray-700 text-gray-300 text-sm rounded-lg hover:bg-gray-800">Bulk Import</button>
            <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 bg-amber-400 text-gray-950 text-sm font-semibold rounded-lg hover:bg-amber-300">+ Add</button>
          </div>
        </div>

        {error && <div className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</div>}

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Policy #</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Name / Company</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Status</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Queries</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
            </thead>
            <tbody>
            {loading ? (
                <tr><td colSpan={5} className="text-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400 mx-auto" /></td></tr>
            ) : phs.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-sm text-gray-600">No policyholders found.</td></tr>
            ) : (
                phs.map((ph) => (
                    <tr key={ph.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                      <td className="px-4 py-3">
                        {editingId === ph.id ? (
                            <input value={editData.policy_number} onChange={(e) => setEditData({ ...editData, policy_number: e.target.value })} className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white font-mono" />
                        ) : (
                            <span className="text-sm font-mono text-white">{ph.policy_number}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {editingId === ph.id ? (
                            <div className="space-y-1">
                              <input value={editData.last_name} onChange={(e) => setEditData({ ...editData, last_name: e.target.value })} className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white" placeholder="Last name" />
                              <input value={editData.company_name} onChange={(e) => setEditData({ ...editData, company_name: e.target.value })} className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white" placeholder="Company" />
                            </div>
                        ) : (
                            <div>
                              {ph.last_name && <div className="text-sm text-gray-300">{ph.last_name}</div>}
                              {ph.company_name && <div className="text-[11px] text-gray-500">{ph.company_name}</div>}
                              {!ph.last_name && !ph.company_name && <span className="text-xs text-gray-600">—</span>}
                            </div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell"><ActiveBadge active={ph.is_active} /></td>
                      <td className="px-4 py-3 text-right text-sm text-gray-400 hidden lg:table-cell">{ph.query_count}</td>
                      <td className="px-4 py-3 text-right">
                        {editingId === ph.id ? (
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => setEditingId(null)} className="px-2 py-1 text-[11px] text-gray-400 border border-gray-700 rounded hover:bg-gray-800">Cancel</button>
                              <button onClick={() => handleSaveEdit(ph.id)} disabled={saving} className="px-2 py-1 text-[11px] bg-amber-400 text-gray-950 font-medium rounded hover:bg-amber-300 disabled:opacity-50">Save</button>
                            </div>
                        ) : (
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => { setEditingId(ph.id); setEditData({ policy_number: ph.policy_number, last_name: ph.last_name || "", company_name: ph.company_name || "" }); setError(""); }} className="px-2 py-1 text-[11px] text-gray-400 border border-gray-700 rounded hover:bg-gray-800">Edit</button>
                              <button onClick={() => handleToggleStatus(ph)} className={`px-2 py-1 text-[11px] rounded border ${ph.is_active ? "text-red-400 border-red-400/30 hover:bg-red-400/10" : "text-emerald-400 border-emerald-400/30 hover:bg-emerald-400/10"}`}>
                                {ph.is_active ? "Deactivate" : "Activate"}
                              </button>
                            </div>
                        )}
                      </td>
                    </tr>
                ))
            )}
            </tbody>
          </table>
          {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
                <span className="text-xs text-gray-600">Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 text-xs border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-800 disabled:opacity-30">Prev</button>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1.5 text-xs border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-800 disabled:opacity-30">Next</button>
                </div>
              </div>
          )}
        </div>

        <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Policyholder">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Policy Number</label>
              <input type="text" value={createData.policy_number} onChange={(e) => setCreateData({ ...createData, policy_number: e.target.value })} required className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-amber-400/50" placeholder="POL-2024-001" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Last Name</label>
              <input type="text" value={createData.last_name} onChange={(e) => setCreateData({ ...createData, last_name: e.target.value })} className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400/50" placeholder="Optional" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Company Name</label>
              <input type="text" value={createData.company_name} onChange={(e) => setCreateData({ ...createData, company_name: e.target.value })} className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400/50" placeholder="Optional" />
            </div>
            <p className="text-[11px] text-gray-600">At least one of last name or company name is recommended for policyholder verification.</p>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border border-gray-700 text-gray-400 text-sm rounded-lg hover:bg-gray-800">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-amber-400 text-gray-950 text-sm font-semibold rounded-lg hover:bg-amber-300 disabled:opacity-50">{saving ? "Creating..." : "Add Policyholder"}</button>
            </div>
          </form>
        </Modal>

        <Modal open={showBulkImport} onClose={() => { setShowBulkImport(false); setBulkResult(null); setBulkText(""); setError(""); }} title="Bulk Import Policyholders">
          <div className="space-y-4">
            <p className="text-xs text-gray-400">Paste CSV data, one row per line. Format: <code className="text-amber-400/80">policy_number,last_name,company_name</code></p>
            <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} rows={8} className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-amber-400/50 resize-none" placeholder={"POL-001,Smith,\nPOL-002,,Acme Corp\nPOL-003,Johnson,Johnson LLC"} />
            {bulkResult && (
                <div className="text-xs space-y-1 bg-gray-800/50 rounded-lg p-3">
                  <div className="text-emerald-400">Created: {bulkResult.created}</div>
                  <div className="text-amber-400">Skipped (duplicates): {bulkResult.skipped}</div>
                  {bulkResult.errors.length > 0 && (
                      <div className="text-red-400">
                        Errors: {bulkResult.errors.length}
                        <ul className="mt-1 list-disc list-inside text-gray-500">
                          {bulkResult.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                          {bulkResult.errors.length > 5 && <li>...and {bulkResult.errors.length - 5} more</li>}
                        </ul>
                      </div>
                  )}
                </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setShowBulkImport(false); setBulkResult(null); setBulkText(""); }} className="flex-1 py-2.5 border border-gray-700 text-gray-400 text-sm rounded-lg hover:bg-gray-800">Close</button>
              <button onClick={handleBulkImport} disabled={saving || !bulkText.trim()} className="flex-1 py-2.5 bg-amber-400 text-gray-950 text-sm font-semibold rounded-lg hover:bg-amber-300 disabled:opacity-50">{saving ? "Importing..." : "Import"}</button>
            </div>
          </div>
        </Modal>
      </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Documents Tab
// ═══════════════════════════════════════════════════════════════════════════

function DocumentsTab({ tenantId }: { tenantId: string }) {
  const { user } = useSuperAdminAuth();
  const [docs, setDocs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [stats, setStats] = useState<any>(null);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");

  const pageSize = 15;

  const loadDocs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [docData, statsData] = await Promise.all([
        listDocuments(user.token, tenantId, { page, page_size: pageSize, document_type: typeFilter || undefined, status: statusFilter || undefined, search: search || undefined }),
        getDocumentStats(user.token, tenantId),
      ]);
      setDocs(docData.documents);
      setTotal(docData.total);
      setStats(statsData);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [user, tenantId, page, search, typeFilter, statusFilter]);

  useEffect(() => { loadDocs(); }, [loadDocs]);
  useEffect(() => { const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300); return () => clearTimeout(t); }, [searchInput]);

  const handleViewDetail = async (docId: string) => { if (!user) return; try { const detail = await getDocument(user.token, tenantId, docId); setSelectedDoc(detail); setShowDetail(true); } catch (err) { console.error(err); } };
  const handleDelete = async (docId: string, filename: string) => { if (!user || !confirm(`Delete "${filename || docId}"?`)) return; setDeleting(docId); setError(""); try { await deleteDocument(user.token, tenantId, docId); loadDocs(); } catch (err: unknown) { setError(err instanceof Error ? err.message : "Delete failed"); } finally { setDeleting(null); } };

  const statusColors: Record<string, string> = { indexed: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", processing: "text-blue-400 bg-blue-400/10 border-blue-400/20", uploading: "text-amber-400 bg-amber-400/10 border-amber-400/20", failed: "text-red-400 bg-red-400/10 border-red-400/20" };
  const totalPages = Math.ceil(total / pageSize);

  return (
      <div className="space-y-4">
        {stats && (<div className="grid grid-cols-2 md:grid-cols-4 gap-3"><div className="bg-gray-800/50 rounded-lg p-3"><div className="text-[11px] text-gray-500 uppercase tracking-wider">Total</div><div className="text-xl font-bold text-white mt-1">{stats.total}</div></div><div className="bg-gray-800/50 rounded-lg p-3"><div className="text-[11px] text-gray-500 uppercase tracking-wider">Policies</div><div className="text-xl font-bold text-white mt-1">{stats.policies}</div></div><div className="bg-gray-800/50 rounded-lg p-3"><div className="text-[11px] text-gray-500 uppercase tracking-wider">Comms</div><div className="text-xl font-bold text-white mt-1">{stats.communications}</div></div><div className="bg-gray-800/50 rounded-lg p-3"><div className="text-[11px] text-gray-500 uppercase tracking-wider">Failed</div><div className={`text-xl font-bold mt-1 ${stats.by_status.failed > 0 ? "text-red-400" : "text-white"}`}>{stats.by_status.failed}</div></div></div>)}
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search by filename, title, or policy #..." className="flex-1 px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-600" />
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-gray-600"><option value="">All types</option><option value="policy">Policies</option><option value="communication">Communications</option></select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-gray-600"><option value="">All statuses</option><option value="indexed">Indexed</option><option value="processing">Processing</option><option value="failed">Failed</option><option value="uploading">Uploading</option></select>
        </div>
        {error && <div className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</div>}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full"><thead><tr className="border-b border-gray-800"><th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Document</th><th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Type</th><th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Status</th><th className="text-right px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Pages</th><th className="text-right px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Chunks</th><th className="text-right px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Actions</th></tr></thead>
            <tbody>
            {loading ? (<tr><td colSpan={6} className="text-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400 mx-auto" /></td></tr>) : docs.length === 0 ? (<tr><td colSpan={6} className="text-center py-12 text-sm text-gray-600">No documents found.</td></tr>) : docs.map((d: any) => (
                <tr key={d.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                  <td className="px-4 py-3"><div className="text-sm font-medium text-white truncate max-w-xs">{d.filename || d.title || "Untitled"}</div>{d.policy_number && <div className="text-[11px] text-gray-500 font-mono">{d.policy_number}</div>}</td>
                  <td className="px-4 py-3 hidden sm:table-cell"><span className="text-xs text-gray-400 capitalize">{d.document_type}</span></td>
                  <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded-full border ${statusColors[d.status] || "text-gray-400 bg-gray-800 border-gray-700"}`}>{d.status}</span></td>
                  <td className="px-4 py-3 text-right text-sm text-gray-400 hidden md:table-cell">{d.page_count ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-400 hidden md:table-cell">{d.chunk_count ?? "—"}</td>
                  <td className="px-4 py-3 text-right"><div className="flex gap-1 justify-end"><button onClick={() => handleViewDetail(d.id)} className="px-2 py-1 text-[11px] text-gray-400 border border-gray-700 rounded hover:bg-gray-800">View</button><button onClick={() => handleDelete(d.id, d.filename)} disabled={deleting === d.id} className="px-2 py-1 text-[11px] text-red-400 border border-red-400/30 rounded hover:bg-red-400/10 disabled:opacity-50">{deleting === d.id ? "..." : "Delete"}</button></div></td>
                </tr>
            ))}
            </tbody>
          </table>
          {totalPages > 1 && (<div className="flex items-center justify-between px-4 py-3 border-t border-gray-800"><span className="text-xs text-gray-600">Page {page} of {totalPages}</span><div className="flex gap-2"><button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 text-xs border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-800 disabled:opacity-30">Prev</button><button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1.5 text-xs border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-800 disabled:opacity-30">Next</button></div></div>)}
        </div>
        {showDetail && selectedDoc && (
            <div className="fixed inset-0 z-50 flex items-center justify-center"><div className="absolute inset-0 bg-black/60" onClick={() => setShowDetail(false)} /><div className="relative bg-gray-900 border border-gray-800 rounded-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto p-6 shadow-2xl"><div className="flex items-center justify-between mb-5"><h3 className="text-base font-semibold text-white">Document Detail</h3><button onClick={() => setShowDetail(false)} className="text-gray-500 hover:text-gray-300 text-lg">✕</button></div><div className="space-y-4"><div className="grid grid-cols-2 gap-3 text-sm"><div><span className="text-gray-500">Filename:</span> <span className="text-white ml-1">{selectedDoc.filename || "—"}</span></div><div><span className="text-gray-500">Type:</span> <span className="text-white ml-1 capitalize">{selectedDoc.document_type}</span></div><div><span className="text-gray-500">Status:</span> <span className="text-white ml-1">{selectedDoc.status}</span></div><div><span className="text-gray-500">Policy #:</span> <span className="text-white ml-1 font-mono">{selectedDoc.policy_number || "—"}</span></div><div><span className="text-gray-500">Pages:</span> <span className="text-white ml-1">{selectedDoc.page_count ?? "—"}</span></div><div><span className="text-gray-500">Chunks:</span> <span className="text-white ml-1">{selectedDoc.chunk_count ?? "—"}</span></div>{selectedDoc.s3_key && <div className="col-span-2"><span className="text-gray-500">S3 Key:</span> <span className="text-white ml-1 font-mono text-xs break-all">{selectedDoc.s3_key}</span></div>}</div>{selectedDoc.chunks && selectedDoc.chunks.length > 0 && (<div><h4 className="text-xs font-medium text-gray-400 mb-2">Chunk Preview (first {selectedDoc.chunks.length})</h4><div className="space-y-2 max-h-60 overflow-y-auto">{selectedDoc.chunks.map((chunk: any, i: number) => (<div key={i} className="bg-gray-800/50 rounded-lg p-3"><div className="flex items-center gap-2 text-[10px] text-gray-600 mb-1"><span>Chunk {chunk.index}</span>{chunk.page && <span>· Page {chunk.page}</span>}{chunk.section && <span>· {chunk.section}</span>}{chunk.tokens && <span>· {chunk.tokens} tokens</span>}</div><p className="text-xs text-gray-300 leading-relaxed">{chunk.text}</p></div>))}</div></div>)}</div></div></div>
        )}
      </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Widget Config Tab
// ═══════════════════════════════════════════════════════════════════════════

function WidgetConfigTab({ tenantId }: { tenantId: string }) {
  const { user } = useSuperAdminAuth();
  const [config, setConfig] = useState<any>(null);
  const [embedCode, setEmbedCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ primary_color: "", header_text: "", welcome_message: "", placeholder_text: "", disclaimer_text: "", disclaimer_enabled: true, logo_url: "", position: "bottom-right" });

  useEffect(() => { if (!user) return; setLoading(true); getWidgetConfig(user.token, tenantId).then((data) => { setConfig(data.config); setEmbedCode(data.embed_code); setForm({ primary_color: data.config.primary_color || "", header_text: data.config.header_text || "", welcome_message: data.config.welcome_message || "", placeholder_text: data.config.placeholder_text || "", disclaimer_text: data.config.disclaimer_text || "", disclaimer_enabled: data.config.disclaimer_enabled ?? true, logo_url: data.config.logo_url || "", position: data.config.position || "bottom-right" }); }).catch((err) => setError(err.message)).finally(() => setLoading(false)); }, [user, tenantId]);

  const handleSave = async () => { if (!user) return; setSaving(true); setError(""); setSuccess(""); try { const data = await updateWidgetConfig(user.token, tenantId, form); setConfig(data.config); setSuccess("Widget configuration saved."); setTimeout(() => setSuccess(""), 3000); } catch (err: unknown) { setError(err instanceof Error ? err.message : "Save failed"); } finally { setSaving(false); } };
  const handleReset = async () => { if (!user || !confirm("Reset widget configuration to defaults?")) return; setSaving(true); setError(""); try { const data = await resetWidgetConfig(user.token, tenantId); setConfig(data.config); setForm({ primary_color: data.config.primary_color || "", header_text: data.config.header_text || "", welcome_message: data.config.welcome_message || "", placeholder_text: data.config.placeholder_text || "", disclaimer_text: data.config.disclaimer_text || "", disclaimer_enabled: data.config.disclaimer_enabled ?? true, logo_url: data.config.logo_url || "", position: data.config.position || "bottom-right" }); setSuccess("Reset to defaults."); setTimeout(() => setSuccess(""), 3000); } catch (err: unknown) { setError(err instanceof Error ? err.message : "Reset failed"); } finally { setSaving(false); } };
  const copyEmbed = () => { navigator.clipboard.writeText(embedCode); setSuccess("Embed code copied!"); setTimeout(() => setSuccess(""), 2000); };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400" /></div>;
  const inputClass = "w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400/50 transition-colors";
  const labelClass = "block text-xs font-medium text-gray-400 mb-1.5";

  return (
      <div className="space-y-6">
        {error && <div className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</div>}
        {success && <div className="text-emerald-400 text-xs bg-emerald-400/10 border border-emerald-400/20 rounded-lg px-3 py-2">{success}</div>}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white">Branding</h3>
            <div><label className={labelClass}>Primary Color</label><div className="flex gap-2"><input type="color" value={form.primary_color || "#2563eb"} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="w-10 h-10 rounded cursor-pointer border border-gray-700 bg-transparent" /><input type="text" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className={inputClass + " font-mono"} placeholder="#2563eb" /></div></div>
            <div><label className={labelClass}>Header Text</label><input type="text" value={form.header_text} onChange={(e) => setForm({ ...form, header_text: e.target.value })} className={inputClass} placeholder="Policy Assistant" /></div>
            <div><label className={labelClass}>Logo URL</label><input type="text" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} className={inputClass} placeholder="https://..." /></div>
            <div><label className={labelClass}>Position</label><select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className={inputClass}><option value="bottom-right">Bottom Right</option><option value="bottom-left">Bottom Left</option></select></div>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white">Messages</h3>
            <div><label className={labelClass}>Welcome Message</label><textarea value={form.welcome_message} onChange={(e) => setForm({ ...form, welcome_message: e.target.value })} rows={3} className={inputClass + " resize-none"} /></div>
            <div><label className={labelClass}>Input Placeholder</label><input type="text" value={form.placeholder_text} onChange={(e) => setForm({ ...form, placeholder_text: e.target.value })} className={inputClass} /></div>
            <div><label className={labelClass}>Disclaimer Text</label><textarea value={form.disclaimer_text} onChange={(e) => setForm({ ...form, disclaimer_text: e.target.value })} rows={3} className={inputClass + " resize-none"} /></div>
            <div className="flex items-center gap-3"><button onClick={() => setForm({ ...form, disclaimer_enabled: !form.disclaimer_enabled })} className={`relative w-10 h-5 rounded-full transition-colors ${form.disclaimer_enabled ? "bg-amber-400" : "bg-gray-700"}`}><span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.disclaimer_enabled ? "left-5" : "left-0.5"}`} /></button><span className="text-xs text-gray-400">Disclaimer enabled</span></div>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={handleSave} disabled={saving} className="px-4 py-2.5 bg-amber-400 text-gray-950 text-sm font-semibold rounded-lg hover:bg-amber-300 disabled:opacity-50">{saving ? "Saving..." : "Save Configuration"}</button>
          <button onClick={handleReset} disabled={saving} className="px-4 py-2.5 border border-gray-700 text-gray-400 text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50">Reset to Defaults</button>
        </div>
        <div className="border-t border-gray-800 pt-6"><h3 className="text-sm font-semibold text-white mb-3">Embed Code</h3><div className="relative"><pre className="bg-gray-800/50 rounded-lg p-4 text-xs text-gray-300 font-mono overflow-x-auto">{embedCode}</pre><button onClick={copyEmbed} className="absolute top-2 right-2 px-2 py-1 text-[11px] text-gray-400 border border-gray-700 rounded hover:bg-gray-800">Copy</button></div></div>
      </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Impersonation Tab
// ═══════════════════════════════════════════════════════════════════════════

function ImpersonationTab({ tenantId }: { tenantId: string }) {
  const { user } = useSuperAdminAuth();
  const [mode, setMode] = useState<"staff" | "policyholder">("staff");
  const [staffList, setStaffList] = useState<any[]>([]);
  const [phList, setPhList] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [staffRole, setStaffRole] = useState("admin");
  const [policyNumber, setPolicyNumber] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLists, setLoadingLists] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => { if (!user) return; setLoadingLists(true); Promise.all([listStaff(user.token, tenantId, { page_size: 50, is_active: true }), listPolicyholders(user.token, tenantId, { page_size: 50, is_active: true })]).then(([staffData, phData]) => { setStaffList(staffData.staff || []); setPhList(phData.policyholders || []); }).catch(console.error).finally(() => setLoadingLists(false)); }, [user, tenantId]);

  const handleImpersonate = async () => { if (!user) return; setLoading(true); setError(""); setResult(null); setCopied(false); try { let data; if (mode === "staff") { data = await impersonateStaff(user.token, tenantId, { staff_id: selectedStaff || undefined, role: staffRole }); } else { if (!policyNumber.trim()) { setError("Enter a policy number"); return; } data = await impersonatePolicyholder(user.token, tenantId, { policy_number: policyNumber.trim() }); } setResult(data); } catch (err: unknown) { setError(err instanceof Error ? err.message : "Impersonation failed"); } finally { setLoading(false); } };
  const copyToken = () => { if (result?.token) { navigator.clipboard.writeText(result.token); setCopied(true); setTimeout(() => setCopied(false), 2000); } };
  const openAsUser = () => { if (!result) return; const baseUrl = "http://localhost:3000"; const path = result.impersonating === "staff" ? "/staff/query" : "/policyholder"; window.open(`${baseUrl}${path}`, "_blank"); };

  if (loadingLists) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400" /></div>;

  return (
      <div className="space-y-6 max-w-xl">
        <div className="bg-amber-400/5 border border-amber-400/20 rounded-lg p-4"><p className="text-xs text-amber-400/80 leading-relaxed">Impersonation generates a short-lived token (2 hours) that lets you view the main app as a specific staff member or policyholder. All actions taken during impersonation are logged in the audit trail.</p></div>
        <div className="flex gap-1 bg-gray-900 rounded-lg p-1 w-fit">
          <button onClick={() => { setMode("staff"); setResult(null); setError(""); }} className={`px-4 py-2 text-xs font-medium rounded-md transition-all ${mode === "staff" ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-300"}`}>Staff</button>
          <button onClick={() => { setMode("policyholder"); setResult(null); setError(""); }} className={`px-4 py-2 text-xs font-medium rounded-md transition-all ${mode === "policyholder" ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-300"}`}>Policyholder</button>
        </div>
        {mode === "staff" && (<div className="space-y-4"><div><label className="block text-xs font-medium text-gray-400 mb-1.5">Staff User</label><select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)} className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400/50"><option value="">Auto-select (first admin)</option>{staffList.map((s: any) => (<option key={s.id} value={s.id}>{s.name || s.email} ({s.role})</option>))}</select></div><div><label className="block text-xs font-medium text-gray-400 mb-1.5">View As Role</label><select value={staffRole} onChange={(e) => setStaffRole(e.target.value)} className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400/50"><option value="admin">Admin</option><option value="staff">Staff</option></select></div></div>)}
        {mode === "policyholder" && (<div className="space-y-4"><div><label className="block text-xs font-medium text-gray-400 mb-1.5">Policy Number</label>{phList.length > 0 ? (<select value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-amber-400/50"><option value="">Select a policyholder...</option>{phList.map((ph: any) => (<option key={ph.id} value={ph.policy_number}>{ph.policy_number} — {ph.last_name || ph.company_name || "Unknown"}</option>))}</select>) : (<input type="text" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-amber-400/50" placeholder="POL-2024-001" />)}</div></div>)}
        {error && <div className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</div>}
        <button onClick={handleImpersonate} disabled={loading} className="px-4 py-2.5 bg-amber-400 text-gray-950 text-sm font-semibold rounded-lg hover:bg-amber-300 disabled:opacity-50">{loading ? "Generating..." : "Generate Token"}</button>
        {result && (<div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400" /><span className="text-sm font-medium text-white">Token Generated</span></div><div className="grid grid-cols-2 gap-3 text-xs"><div><span className="text-gray-500">Impersonating:</span> <span className="text-white ml-1 capitalize">{result.impersonating}</span></div><div><span className="text-gray-500">As:</span> <span className="text-white ml-1">{result.user_identifier}</span></div><div><span className="text-gray-500">Role:</span> <span className="text-white ml-1">{result.role}</span></div><div><span className="text-gray-500">Expires in:</span> <span className="text-white ml-1">{result.expires_in_hours}h</span></div></div><p className="text-[11px] text-amber-400/70">{result.notice}</p><div className="relative"><pre className="bg-gray-800/50 rounded-lg p-3 text-[11px] text-gray-400 font-mono break-all overflow-x-auto max-h-20">{result.token}</pre><button onClick={copyToken} className="absolute top-2 right-2 px-2 py-1 text-[11px] text-gray-400 border border-gray-700 rounded hover:bg-gray-800">{copied ? "Copied!" : "Copy"}</button></div><div className="flex gap-3"><button onClick={openAsUser} className="px-3 py-2 text-xs border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800">Open Main App</button><button onClick={copyToken} className="px-3 py-2 text-xs border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800">{copied ? "Copied!" : "Copy Token"}</button></div><div className="text-[11px] text-gray-600 leading-relaxed"><strong>To use:</strong> Copy the token, open the main client app, open browser DevTools → Console, and run:<code className="block mt-1 bg-gray-800 rounded px-2 py-1 text-amber-400/70">localStorage.setItem(&quot;auth&quot;, JSON.stringify({`{`}token: &quot;PASTE_TOKEN&quot;, role: &quot;{result.role}&quot;, tenant_id: &quot;{result.tenant_id}&quot;{`}`})); location.reload();</code></div></div>)}
      </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Onboarding Tab
// ═══════════════════════════════════════════════════════════════════════════

function OnboardingTab({ tenantId }: { tenantId: string }) {
  const { user } = useSuperAdminAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => { if (!user) return; setLoading(true); try { setData(await getOnboardingStatus(user.token, tenantId)); } catch (err) { console.error(err); } finally { setLoading(false); } }, [user, tenantId]);
  useEffect(() => { load(); }, [load]);
  const handleToggle = async (stepKey: string, currentlyCompleted: boolean) => { if (!user) return; setToggling(stepKey); try { const updated = await updateOnboardingStep(user.token, tenantId, stepKey, !currentlyCompleted); setData(updated); } catch (err) { console.error(err); } finally { setToggling(null); } };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400" /></div>;
  if (!data) return <p className="text-gray-500">Failed to load onboarding status.</p>;

  return (
      <div className="space-y-6 max-w-xl">
        <div><div className="flex items-center justify-between mb-2"><span className="text-sm font-medium text-white">Onboarding Progress</span><span className="text-sm text-amber-400">{data.progress_pct}%</span></div><div className="h-2 bg-gray-800 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${data.is_complete ? "bg-emerald-400" : "bg-amber-400"}`} style={{ width: `${data.progress_pct}%` }} /></div></div>
        <div className="space-y-2">{data.steps.map((step: any) => (<div key={step.key} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${step.completed ? "bg-emerald-400/5 border-emerald-400/20" : "bg-gray-900 border-gray-800"}`}><button onClick={() => handleToggle(step.key, step.completed)} disabled={toggling === step.key} className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${step.completed ? "bg-emerald-400 border-emerald-400 text-white" : "border-gray-600 hover:border-gray-400"}`}>{step.completed && <span className="text-xs">✓</span>}</button><div className="flex-1 min-w-0"><span className={`text-sm ${step.completed ? "text-gray-300" : "text-white"}`}>{step.label}</span>{step.completed_at && (<span className="text-[10px] text-gray-600 ml-2">{new Date(step.completed_at).toLocaleDateString()}</span>)}</div></div>))}</div>
        {data.is_complete && (<div className="bg-emerald-400/10 border border-emerald-400/20 rounded-lg p-4 text-center"><span className="text-emerald-400 text-sm font-medium">Onboarding complete!</span></div>)}
      </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Compliance Tab
// ═══════════════════════════════════════════════════════════════════════════

function ComplianceTab({ tenantId }: { tenantId: string }) {
  const { user } = useSuperAdminAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [text, setText] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { if (!user) return; setLoading(true); getDisclaimer(user.token, tenantId).then((d) => { setData(d); setText(d.disclaimer_text); setEnabled(d.disclaimer_enabled); }).catch(console.error).finally(() => setLoading(false)); }, [user, tenantId]);
  const handleSave = async () => { if (!user) return; setSaving(true); setError(""); setSuccess(""); try { const updated = await updateDisclaimer(user.token, tenantId, { disclaimer_text: text, disclaimer_enabled: enabled }); setData(updated); setSuccess("Disclaimer updated."); setTimeout(() => setSuccess(""), 3000); } catch (err: any) { setError(err.message); } finally { setSaving(false); } };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400" /></div>;

  return (
      <div className="space-y-6 max-w-xl">
        {success && <div className="text-emerald-400 text-xs bg-emerald-400/10 border border-emerald-400/20 rounded-lg px-3 py-2">{success}</div>}
        {error && <div className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</div>}
        <div><label className="block text-xs font-medium text-gray-400 mb-1.5">Disclaimer Text</label><textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400/50 resize-none" /></div>
        <div className="flex items-center gap-3"><button onClick={() => setEnabled(!enabled)} className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? "bg-amber-400" : "bg-gray-700"}`}><span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${enabled ? "left-5" : "left-0.5"}`} /></button><span className="text-xs text-gray-400">Disclaimer {enabled ? "enabled" : "disabled"}</span></div>
        {data?.acceptance_count !== undefined && (<div className="bg-gray-800/50 rounded-lg p-3"><div className="text-[11px] text-gray-500 uppercase tracking-wider">Acceptance Count</div><div className="text-xl font-bold text-white mt-1">{data.acceptance_count}</div></div>)}
        <button onClick={handleSave} disabled={saving} className="px-4 py-2.5 bg-amber-400 text-gray-950 text-sm font-semibold rounded-lg hover:bg-amber-300 disabled:opacity-50">{saving ? "Saving..." : "Save Disclaimer"}</button>
      </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Billing Tab
// ═══════════════════════════════════════════════════════════════════════════

function BillingTab({ tenantId }: { tenantId: string }) {
  const { user } = useSuperAdminAuth();
  const [usage, setUsage] = useState<any>(null);
  const [plans, setPlans] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [changingPlan, setChangingPlan] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => { if (!user) return; setLoading(true); Promise.all([getTenantUsage(user.token, tenantId), listPlans(user.token)]).then(([u, p]) => { setUsage(u); setPlans(p); }).catch(console.error).finally(() => setLoading(false)); }, [user, tenantId]);
  const handleChangePlan = async (plan: string) => { if (!user) return; setChangingPlan(true); setSuccess(""); try { await assignPlan(user.token, tenantId, plan); const updated = await getTenantUsage(user.token, tenantId); setUsage(updated); setSuccess(`Plan changed to ${plan}.`); setTimeout(() => setSuccess(""), 3000); } catch (err) { console.error(err); } finally { setChangingPlan(false); } };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400" /></div>;
  if (!usage) return <p className="text-gray-500">Failed to load billing data.</p>;

  const usageBar = (used: number, limit: number, label: string) => { const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0; const unlimited = limit === 0; return (<div className="space-y-1"><div className="flex justify-between text-xs"><span className="text-gray-400">{label}</span><span className="text-gray-500">{used.toLocaleString()} / {unlimited ? "∞" : limit.toLocaleString()}</span></div><div className="h-2 bg-gray-800 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${pct >= 90 ? "bg-red-400" : pct >= 70 ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: unlimited ? "0%" : `${pct}%` }} /></div></div>); };

  return (
      <div className="space-y-6">
        {success && <div className="text-emerald-400 text-xs bg-emerald-400/10 border border-emerald-400/20 rounded-lg px-3 py-2">{success}</div>}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4"><div><div className="text-xs text-gray-500 uppercase tracking-wider">Current Plan</div><div className="text-lg font-bold text-white capitalize mt-1">{usage.plan}</div></div><div className="text-xs text-gray-500">Period: {usage.period}</div></div>
          <div className="space-y-3">{usageBar(usage.queries_used, usage.queries_limit, "Queries (monthly)")}{usageBar(usage.documents_count, usage.documents_limit, "Documents")}{usageBar(usage.staff_count, usage.staff_limit, "Staff users")}{usageBar(usage.policyholders_count, usage.policyholders_limit, "Policyholders")}</div>
          {usage.at_risk && (<div className="mt-4 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">This tenant is approaching their query limit ({usage.usage_pct}% used).</div>)}
        </div>
        <div><h3 className="text-sm font-semibold text-white mb-3">Change Plan</h3><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Object.entries(plans).map(([key, plan]: [string, any]) => (<button key={key} onClick={() => handleChangePlan(key)} disabled={changingPlan || key === usage.plan} className={`p-3 rounded-lg border text-left transition-all ${key === usage.plan ? "bg-amber-400/10 border-amber-400/30 text-amber-400" : "bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700"} disabled:opacity-50`}><div className="text-sm font-medium capitalize">{plan.name}</div><div className="text-[10px] text-gray-600 mt-1">{plan.query_limit_monthly === 0 ? "Unlimited" : `${plan.query_limit_monthly.toLocaleString()}`} queries/mo</div>{key === usage.plan && <div className="text-[10px] text-amber-400 mt-1">Current</div>}</button>))}</div></div>
      </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useSuperAdminAuth();
  const tenantId = params.tenantId as string;

  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "staff" | "policyholders" | "documents" | "widget" | "impersonate" | "onboarding" | "compliance" | "billing">("overview");

  useEffect(() => { if (!user || !tenantId) return; setLoading(true); getTenant(user.token, tenantId).then(setTenant).catch((err) => console.error(err)).finally(() => setLoading(false)); }, [user, tenantId]);

  if (loading) return (<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" /></div>);
  if (!tenant) return (<div className="p-6 lg:p-8"><p className="text-gray-500">Tenant not found.</p><button onClick={() => router.push("/superadmin/tenants")} className="mt-4 text-sm text-amber-400 hover:text-amber-300">← Back to Tenants</button></div>);

  const tabs = [
    { key: "overview" as const, label: "Overview" },
    { key: "staff" as const, label: `Staff (${tenant.staff_count})` },
    { key: "policyholders" as const, label: `Policyholders (${tenant.policyholder_count})` },
    { key: "documents" as const, label: `Documents (${tenant.policy_count + tenant.communication_count})` },
    { key: "widget" as const, label: "Widget" },
    { key: "onboarding" as const, label: "Onboarding" },
    { key: "compliance" as const, label: "Compliance" },
    { key: "billing" as const, label: "Billing" },
    { key: "impersonate" as const, label: "View As" },
  ];

  return (
      <div className="p-6 lg:p-8 max-w-6xl">
        <div className="mb-6">
          <button onClick={() => router.push("/superadmin/tenants")} className="text-xs text-gray-500 hover:text-gray-300 mb-3 inline-block">← Back to Tenants</button>
          <div className="flex items-start gap-3"><div><h1 className="text-2xl font-semibold text-white">{tenant.name}</h1><div className="flex items-center gap-3 mt-1"><span className="text-xs text-gray-500 font-mono">{tenant.slug}</span><StatusBadge status={tenant.status} /><span className="text-xs text-gray-600">Created {new Date(tenant.created_at).toLocaleDateString()}</span></div></div></div>
        </div>
        <div className="flex gap-1 mb-6 bg-gray-900 rounded-lg p-1 w-fit">{tabs.map((t) => (<button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-xs font-medium rounded-md transition-all ${tab === t.key ? "bg-gray-800 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"}`}>{t.label}</button>))}</div>
        {tab === "overview" && <OverviewTab tenant={tenant} />}
        {tab === "staff" && <StaffTab tenantId={tenantId} />}
        {tab === "policyholders" && <PolicyholdersTab tenantId={tenantId} />}
        {tab === "documents" && <DocumentsTab tenantId={tenantId} />}
        {tab === "widget" && <WidgetConfigTab tenantId={tenantId} />}
        {tab === "impersonate" && <ImpersonationTab tenantId={tenantId} />}
        {tab === "onboarding" && <OnboardingTab tenantId={tenantId} />}
        {tab === "compliance" && <ComplianceTab tenantId={tenantId} />}
        {tab === "billing" && <BillingTab tenantId={tenantId} />}
      </div>
  );
}