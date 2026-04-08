"use client";

import React, { useState } from "react";
import { useSuperAdminAuth } from "@/lib/superadmin-auth-context";
import { queryLookup, verificationDebug, clearFailedDocs, getFailedDocsSummary, listTenants } from "@/lib/superadmin-api";

export default function SupportToolsPage() {
  const { user } = useSuperAdminAuth();
  const [activeTab, setActiveTab] = useState<"query" | "verify" | "maintenance">("query");

  const tabs = [
    { key: "query" as const, label: "Query Lookup" },
    { key: "verify" as const, label: "Verification Debug" },
    { key: "maintenance" as const, label: "Maintenance" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <h1 className="text-2xl font-semibold text-heading mb-6">Support Tools</h1>
      <div className="flex gap-1 mb-6 bg-card rounded-lg p-1 w-fit">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-xs font-medium rounded-md transition-all ${activeTab === t.key ? "bg-surface text-heading" : "text-muted hover:text-body"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {activeTab === "query" && <QueryLookupSection />}
      {activeTab === "verify" && <VerificationSection />}
      {activeTab === "maintenance" && <MaintenanceSection />}
    </div>
  );
}

function QueryLookupSection() {
  const { user } = useSuperAdminAuth();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const doSearch = async (p = 1) => {
    if (!user || !search.trim()) return;
    setLoading(true);
    try {
      const data = await queryLookup(user.token, { search, page: p, page_size: 10 });
      setResults(data.queries); setTotal(data.total); setPage(p);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doSearch()}
          placeholder="Search questions, answers, policy numbers..."
          className="flex-1 px-3 py-2.5 bg-surface border border-input-border rounded-lg text-sm text-heading placeholder-muted focus:outline-none focus:border-input-border" />
        <button onClick={() => doSearch()} disabled={loading}
          className="px-4 py-2.5 bg-accent text-on-accent text-sm font-semibold rounded-lg hover:bg-accent-hover disabled:opacity-50">
          {loading ? "..." : "Search"}
        </button>
      </div>
      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-muted">{total} result{total !== 1 ? "s" : ""}</p>
          {results.map((q: any) => (
            <div key={q.id} className="bg-card border border-border-default rounded-xl p-4">
              <div className="flex items-center gap-2 text-[10px] text-faint mb-2">
                <span className="font-medium text-secondary">{q.tenant_name}</span>
                <span>·</span><span>{q.user_type}</span>
                <span>·</span><span>{q.user_identifier}</span>
                {q.policy_number && <><span>·</span><span className="font-mono">{q.policy_number}</span></>}
                <span>·</span><span>{new Date(q.queried_at).toLocaleString()}</span>
              </div>
              <p className="text-sm text-heading mb-1"><strong>Q:</strong> {q.question}</p>
              {q.answer && <p className="text-xs text-secondary line-clamp-3"><strong>A:</strong> {q.answer}</p>}
              <div className="flex gap-3 mt-2 text-[10px] text-faint">
                {q.confidence && <span>Confidence: {(q.confidence * 100).toFixed(0)}%</span>}
                {q.latency_ms && <span>Latency: {q.latency_ms}ms</span>}
              </div>
            </div>
          ))}
          {total > 10 && (
            <div className="flex gap-2 justify-center">
              <button onClick={() => doSearch(page - 1)} disabled={page <= 1} className="px-3 py-1.5 text-xs border border-input-border text-secondary rounded-lg disabled:opacity-30">Prev</button>
              <span className="text-xs text-muted py-1.5">Page {page}</span>
              <button onClick={() => doSearch(page + 1)} disabled={page * 10 >= total} className="px-3 py-1.5 text-xs border border-input-border text-secondary rounded-lg disabled:opacity-30">Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VerificationSection() {
  const { user } = useSuperAdminAuth();
  const [tenants, setTenants] = useState<any[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  React.useEffect(() => {
    if (!user || loaded) return;
    listTenants(user.token, { page_size: 100 }).then((d) => { setTenants(d.tenants); setLoaded(true); }).catch(console.error);
  }, [user, loaded]);

  const doVerify = async () => {
    if (!user || !tenantId || !policyNumber.trim()) return;
    setLoading(true); setResult(null);
    try {
      const data = await verificationDebug(user.token, tenantId, policyNumber.trim());
      setResult(data);
    } catch (err: any) { setResult({ error: err.message }); }
    finally { setLoading(false); }
  };

  const checkStyle = (ok: boolean) => ok ? "text-emerald-400" : "text-red-400";

  return (
    <div className="space-y-4 max-w-lg">
      <p className="text-xs text-muted">Check whether a policyholder can authenticate and query their policy.</p>
      <div>
        <label className="block text-xs font-medium text-secondary mb-1.5">Tenant</label>
        <select value={tenantId} onChange={(e) => setTenantId(e.target.value)}
          className="w-full px-3 py-2.5 bg-surface border border-input-border rounded-lg text-sm text-heading focus:outline-none focus:border-input-border">
          <option value="">Select tenant...</option>
          {tenants.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-secondary mb-1.5">Policy Number</label>
        <input type="text" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doVerify()}
          className="w-full px-3 py-2.5 bg-surface border border-input-border rounded-lg text-sm text-heading font-mono focus:outline-none focus:border-input-border"
          placeholder="POL-2024-001" />
      </div>
      <button onClick={doVerify} disabled={loading || !tenantId || !policyNumber.trim()}
        className="px-4 py-2.5 bg-accent text-on-accent text-sm font-semibold rounded-lg hover:bg-accent-hover disabled:opacity-50">
        {loading ? "Checking..." : "Run Check"}
      </button>

      {result && !result.error && (
        <div className="bg-card border border-border-default rounded-xl p-4 space-y-2">
          <h4 className="text-sm font-medium text-heading">{result.tenant_name} — {result.policy_number}</h4>
          <div className="space-y-1 text-sm">
            <div className={checkStyle(result.found)}>{result.found ? "✓" : "✗"} Policyholder record {result.found ? "found" : "NOT found"}</div>
            {result.policyholder && (
              <div className="text-xs text-muted ml-4">
                {result.policyholder.last_name && `Last name: ${result.policyholder.last_name}`}
                {result.policyholder.company_name && ` | Company: ${result.policyholder.company_name}`}
                {` | Active: ${result.policyholder.is_active}`}
              </div>
            )}
            <div className={checkStyle(result.has_documents)}>{result.has_documents ? "✓" : "✗"} Documents: {result.document_count} found</div>
            <div className={checkStyle(result.is_indexed)}>{result.is_indexed ? "✓" : "✗"} At least one document indexed: {result.is_indexed ? "Yes" : "No"}</div>
          </div>
        </div>
      )}
      {result?.error && <div className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{result.error}</div>}
    </div>
  );
}

function MaintenanceSection() {
  const { user } = useSuperAdminAuth();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [result, setResult] = useState("");

  const loadSummary = async () => {
    if (!user) return;
    setLoading(true);
    try { setSummary(await getFailedDocsSummary(user.token)); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  React.useEffect(() => { loadSummary(); }, [user]);

  const handleClear = async (tenantId?: string) => {
    if (!user) return;
    setClearing(true); setResult("");
    try {
      const data = await clearFailedDocs(user.token, tenantId);
      setResult(`Reset ${data.reset_count} document(s) to uploading status.`);
      loadSummary();
    } catch (err: any) { setResult(err.message); }
    finally { setClearing(false); }
  };

  return (
    <div className="space-y-4 max-w-lg">
      <h3 className="text-sm font-semibold text-heading">Failed Documents</h3>
      {loading ? (
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent" />
      ) : summary ? (
        <div className="space-y-3">
          <div className="bg-card border border-border-default rounded-xl p-4">
            <div className="text-[11px] text-muted uppercase tracking-wider">Total Failed</div>
            <div className={`text-2xl font-bold mt-1 ${summary.total_failed > 0 ? "text-red-400" : "text-heading"}`}>{summary.total_failed}</div>
          </div>
          {summary.by_tenant?.length > 0 && (
            <div className="space-y-2">
              {summary.by_tenant.map((t: any) => (
                <div key={t.tenant_id} className="flex items-center justify-between bg-card border border-border-default rounded-lg px-4 py-3">
                  <div>
                    <span className="text-sm text-heading">{t.tenant_name}</span>
                    <span className="text-xs text-red-400 ml-2">{t.count} failed</span>
                  </div>
                  <button onClick={() => handleClear(t.tenant_id)} disabled={clearing}
                    className="px-2 py-1 text-[11px] text-accent border border-accent/30 rounded hover:bg-accent/10 disabled:opacity-50">
                    Reset
                  </button>
                </div>
              ))}
            </div>
          )}
          {summary.total_failed > 0 && (
            <button onClick={() => handleClear()} disabled={clearing}
              className="px-4 py-2.5 bg-accent text-on-accent text-sm font-semibold rounded-lg hover:bg-accent-hover disabled:opacity-50">
              {clearing ? "Resetting..." : "Reset All Failed Documents"}
            </button>
          )}
        </div>
      ) : null}
      {result && <div className="text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-lg px-3 py-2">{result}</div>}
    </div>
  );
}
