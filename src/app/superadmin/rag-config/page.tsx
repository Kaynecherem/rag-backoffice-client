"use client";

import React, { useEffect, useState } from "react";
import { useSuperAdminAuth } from "@/lib/superadmin-auth-context";
import { getRAGConfig, updateRAGConfig, resetRAGConfig } from "@/lib/superadmin-api";

export default function RAGConfigPage() {
  const { user } = useSuperAdminAuth();
  const [config, setConfig] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [editSection, setEditSection] = useState<string | null>(null);
  const [editJson, setEditJson] = useState("");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getRAGConfig(user.token).then(setConfig).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  const handleSaveSection = async () => {
    if (!user || !editSection) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      const parsed = JSON.parse(editJson);
      const updated = await updateRAGConfig(user.token, { [editSection]: parsed });
      setConfig(updated);
      setEditSection(null);
      setSuccess(`${editSection} updated.`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message?.includes("JSON") ? "Invalid JSON" : (err.message || "Save failed"));
    } finally { setSaving(false); }
  };

  const handleReset = async () => {
    if (!user || !confirm("Reset all RAG settings to defaults?")) return;
    setSaving(true);
    try {
      const data = await resetRAGConfig(user.token);
      setConfig(data);
      setSuccess("Reset to defaults.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>;

  const sections = config ? Object.entries(config).filter(([k]) => k !== "description") : [];

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-heading">RAG Pipeline</h1>
          <p className="text-sm text-muted mt-1">Chunking, embedding, retrieval, LLM, and prompt configuration</p>
        </div>
        <button onClick={handleReset} disabled={saving} className="px-4 py-2.5 border border-input-border text-secondary text-sm rounded-lg hover:bg-surface disabled:opacity-50 self-start">Reset Defaults</button>
      </div>

      {success && <div className="text-emerald-400 text-xs bg-emerald-400/10 border border-emerald-400/20 rounded-lg px-3 py-2 mb-4">{success}</div>}
      {error && <div className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-4">{error}</div>}

      <div className="space-y-4">
        {sections.map(([key, value]) => (
          <div key={key} className="bg-card border border-border-default rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-heading capitalize">{key}</h3>
              <button onClick={() => {
                if (editSection === key) { setEditSection(null); } else {
                  const { description, ...rest } = value as any;
                  setEditSection(key); setEditJson(JSON.stringify(rest, null, 2)); setError("");
                }
              }} className="px-2 py-1 text-[11px] text-accent border border-accent/30 rounded hover:bg-accent/10">
                {editSection === key ? "Cancel" : "Edit"}
              </button>
            </div>
            {(value as any).description && <p className="text-xs text-muted mb-3">{(value as any).description}</p>}

            {editSection === key ? (
              <div className="space-y-3">
                <textarea value={editJson} onChange={(e) => setEditJson(e.target.value)} rows={8}
                  className="w-full px-3 py-2.5 bg-surface border border-input-border rounded-lg text-xs text-heading font-mono focus:outline-none focus:border-accent/50 resize-none" />
                <button onClick={handleSaveSection} disabled={saving}
                  className="px-4 py-2 bg-accent text-on-accent text-xs font-semibold rounded-lg hover:bg-accent-hover disabled:opacity-50">
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(value as any).filter(([k]) => k !== "description").map(([k, v]) => (
                  <div key={k} className="text-xs">
                    <span className="text-muted">{k}:</span>{" "}
                    <span className="text-body">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
