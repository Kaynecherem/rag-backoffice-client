"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSuperAdminAuth } from "@/lib/superadmin-auth-context";
import {
    listSuperadmins,
    createSuperadmin,
    updateSuperadmin,
    toggleSuperadminStatus,
    changeSuperadminPassword,
} from "@/lib/superadmin-api";

interface AdminItem {
    id: string;
    email: string;
    name: string;
    is_active: boolean;
    last_login_at: string | null;
    created_at: string;
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

export default function AdminsPage() {
    const { user } = useSuperAdminAuth();
    const [admins, setAdmins] = useState<AdminItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Create modal
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({ email: "", name: "", password: "" });
    const [createError, setCreateError] = useState("");
    const [creating, setCreating] = useState(false);

    // Edit modal
    const [editAdmin, setEditAdmin] = useState<AdminItem | null>(null);
    const [editForm, setEditForm] = useState({ name: "", email: "" });
    const [editError, setEditError] = useState("");
    const [saving, setSaving] = useState(false);

    // Password modal
    const [pwAdmin, setPwAdmin] = useState<AdminItem | null>(null);
    const [pwForm, setPwForm] = useState({ current_password: "", new_password: "" });
    const [pwError, setPwError] = useState("");
    const [pwSaving, setPwSaving] = useState(false);

    const [success, setSuccess] = useState("");

    const fetchAdmins = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await listSuperadmins(user.token);
            setAdmins(data.admins || []);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to load admins");
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

    const showSuccess = (msg: string) => {
        setSuccess(msg);
        setTimeout(() => setSuccess(""), 3000);
    };

    // ── Create ──────────────────────────────────────────────────────────

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setCreateError("");
        setCreating(true);
        try {
            await createSuperadmin(user.token, createForm);
            setCreateForm({ email: "", name: "", password: "" });
            setShowCreate(false);
            showSuccess("Superadmin created successfully");
            fetchAdmins();
        } catch (err: unknown) {
            setCreateError(err instanceof Error ? err.message : "Failed to create admin");
        } finally {
            setCreating(false);
        }
    };

    // ── Edit ────────────────────────────────────────────────────────────

    const openEdit = (admin: AdminItem) => {
        setEditAdmin(admin);
        setEditForm({ name: admin.name, email: admin.email });
        setEditError("");
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !editAdmin) return;
        setEditError("");
        setSaving(true);
        try {
            await updateSuperadmin(user.token, editAdmin.id, editForm);
            setEditAdmin(null);
            showSuccess("Admin updated");
            fetchAdmins();
        } catch (err: unknown) {
            setEditError(err instanceof Error ? err.message : "Failed to update");
        } finally {
            setSaving(false);
        }
    };

    // ── Password ────────────────────────────────────────────────────────

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !pwAdmin) return;
        setPwError("");
        setPwSaving(true);
        try {
            await changeSuperadminPassword(user.token, pwAdmin.id, pwForm);
            setPwAdmin(null);
            setPwForm({ current_password: "", new_password: "" });
            showSuccess("Password changed");
        } catch (err: unknown) {
            setPwError(err instanceof Error ? err.message : "Failed to change password");
        } finally {
            setPwSaving(false);
        }
    };

    // ── Toggle Status ───────────────────────────────────────────────────

    const handleToggle = async (admin: AdminItem) => {
        if (!user) return;
        const newStatus = !admin.is_active;
        const action = newStatus ? "activate" : "deactivate";
        if (!confirm(`Are you sure you want to ${action} ${admin.email}?`)) return;
        try {
            await toggleSuperadminStatus(user.token, admin.id, newStatus);
            showSuccess(`Admin ${action}d`);
            fetchAdmins();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : `Failed to ${action}`);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-white">Superadmin Accounts</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage platform administrator accounts
                    </p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="px-4 py-2 bg-amber-400 text-gray-950 text-sm font-semibold rounded-lg hover:bg-amber-300"
                >
                    + New Admin
                </button>
            </div>

            {success && (
                <div className="text-emerald-400 text-xs bg-emerald-400/10 border border-emerald-400/20 rounded-lg px-3 py-2">
                    {success}
                </div>
            )}
            {error && (
                <div className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                    {error}
                </div>
            )}

            {/* Admin List */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead>
                    <tr className="border-b border-gray-800">
                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                        <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {admins.map((admin) => (
                        <tr key={admin.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                            <td className="px-5 py-3 text-sm text-white">{admin.name}</td>
                            <td className="px-5 py-3 text-sm text-gray-400">{admin.email}</td>
                            <td className="px-5 py-3">
                  <span className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded-full border ${
                      admin.is_active
                          ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/20"
                          : "bg-red-400/10 text-red-400 border-red-400/20"
                  }`}>
                    {admin.is_active ? "Active" : "Inactive"}
                  </span>
                            </td>
                            <td className="px-5 py-3 text-xs text-gray-500">
                                {admin.last_login_at
                                    ? new Date(admin.last_login_at).toLocaleDateString()
                                    : "Never"}
                            </td>
                            <td className="px-5 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => openEdit(admin)}
                                        className="text-xs text-gray-400 hover:text-amber-400 transition"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => { setPwAdmin(admin); setPwForm({ current_password: "", new_password: "" }); setPwError(""); }}
                                        className="text-xs text-gray-400 hover:text-amber-400 transition"
                                    >
                                        Password
                                    </button>
                                    <button
                                        onClick={() => handleToggle(admin)}
                                        className={`text-xs transition ${
                                            admin.is_active
                                                ? "text-gray-400 hover:text-red-400"
                                                : "text-gray-400 hover:text-emerald-400"
                                        }`}
                                    >
                                        {admin.is_active ? "Deactivate" : "Activate"}
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {admins.length === 0 && (
                        <tr>
                            <td colSpan={5} className="text-center py-8 text-gray-500 text-sm">
                                No superadmin accounts found
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>

            {/* Create Modal */}
            <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Superadmin">
                <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Name</label>
                        <input type="text" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} required className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400/50" placeholder="Admin name" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
                        <input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} required className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400/50" placeholder="admin@company.com" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
                        <input type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} required minLength={8} className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400/50" placeholder="Min 8 characters" />
                    </div>
                    {createError && <div className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{createError}</div>}
                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={creating} className="px-4 py-2.5 bg-amber-400 text-gray-950 text-sm font-semibold rounded-lg hover:bg-amber-300 disabled:opacity-50">{creating ? "Creating..." : "Create Admin"}</button>
                        <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2.5 border border-gray-700 text-gray-400 text-sm rounded-lg hover:bg-gray-800">Cancel</button>
                    </div>
                </form>
            </Modal>

            {/* Edit Modal */}
            <Modal open={!!editAdmin} onClose={() => setEditAdmin(null)} title="Edit Superadmin">
                <form onSubmit={handleEdit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Name</label>
                        <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400/50" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
                        <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400/50" />
                    </div>
                    {editError && <div className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{editError}</div>}
                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={saving} className="px-4 py-2.5 bg-amber-400 text-gray-950 text-sm font-semibold rounded-lg hover:bg-amber-300 disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
                        <button type="button" onClick={() => setEditAdmin(null)} className="px-4 py-2.5 border border-gray-700 text-gray-400 text-sm rounded-lg hover:bg-gray-800">Cancel</button>
                    </div>
                </form>
            </Modal>

            {/* Password Modal */}
            <Modal open={!!pwAdmin} onClose={() => setPwAdmin(null)} title={`Change Password — ${pwAdmin?.email}`}>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Current Password</label>
                        <input type="password" value={pwForm.current_password} onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })} required minLength={8} className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400/50" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">New Password</label>
                        <input type="password" value={pwForm.new_password} onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })} required minLength={8} className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400/50" placeholder="Min 8 characters" />
                    </div>
                    {pwError && <div className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{pwError}</div>}
                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={pwSaving} className="px-4 py-2.5 bg-amber-400 text-gray-950 text-sm font-semibold rounded-lg hover:bg-amber-300 disabled:opacity-50">{pwSaving ? "Changing..." : "Change Password"}</button>
                        <button type="button" onClick={() => setPwAdmin(null)} className="px-4 py-2.5 border border-gray-700 text-gray-400 text-sm rounded-lg hover:bg-gray-800">Cancel</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}