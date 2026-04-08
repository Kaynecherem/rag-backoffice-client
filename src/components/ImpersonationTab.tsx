/**
 * REPLACE the ImpersonationTab component in src/app/superadmin/tenants/[tenantId]/page.tsx
 *
 * Changes:
 *  - openAsUser() now builds the correct tenant subdomain URL
 *    (e.g., levanti.agencylensai.com) instead of localhost:3000
 *  - Passes impersonation token and impersonator name as URL params
 *    so the client app can auto-authenticate and show "Viewing as" banner
 *  - Shows impersonator name from the API response
 */
import {useSuperAdminAuth} from "@/lib/superadmin-auth-context";
import {useEffect, useState} from "react";
import {impersonatePolicyholder, impersonateStaff, listPolicyholders, listStaff} from "@/lib/superadmin-api";

// ═══════════════════════════════════════════════════════════════════════════
// Impersonation Tab (REPLACEMENT)
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

    useEffect(() => {
        if (!user) return;
        setLoadingLists(true);
        Promise.all([
            listStaff(user.token, tenantId, { page_size: 50, is_active: true }),
            listPolicyholders(user.token, tenantId, { page_size: 50, is_active: true }),
        ])
            .then(([staffData, phData]) => {
                setStaffList(staffData.staff || []);
                setPhList(phData.policyholders || []);
            })
            .catch(console.error)
            .finally(() => setLoadingLists(false));
    }, [user, tenantId]);

    const handleImpersonate = async () => {
        if (!user) return;
        setLoading(true);
        setError("");
        setResult(null);
        setCopied(false);
        try {
            let data;
            if (mode === "staff") {
                data = await impersonateStaff(user.token, tenantId, {
                    staff_id: selectedStaff || undefined,
                    role: staffRole,
                });
            } else {
                if (!policyNumber.trim()) {
                    setError("Enter a policy number");
                    return;
                }
                data = await impersonatePolicyholder(user.token, tenantId, {
                    policy_number: policyNumber.trim(),
                });
            }
            setResult(data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Impersonation failed");
        } finally {
            setLoading(false);
        }
    };

    const copyToken = () => {
        if (result?.token) {
            navigator.clipboard.writeText(result.token);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const openAsUser = () => {
        if (!result) return;

        // Build the correct tenant subdomain URL
        const slug = result.tenant_slug;
        const impersonatorName = result.impersonator_name || user?.name || user?.email || "Superadmin";

        let baseUrl: string;
        if (slug && process.env.NODE_ENV === "production") {
            // Production: use tenant subdomain
            baseUrl = `https://${slug}.agencylensai.com`;
        } else if (slug) {
            // Dev with slug available: still use subdomain if possible, else localhost
            baseUrl = `https://${slug}.agencylensai.com`;
        } else {
            // Fallback
            baseUrl = "http://localhost:3000";
        }

        const path = result.impersonating === "staff" ? "/staff/query" : "/policyholder";

        // Pass token and impersonator info as URL params for auto-auth
        const params = new URLSearchParams({
            impersonate_token: result.token,
            impersonator: impersonatorName,
            tenant_id: result.tenant_id,
        });

        window.open(`${baseUrl}${path}?${params.toString()}`, "_blank");
    };

    if (loadingLists)
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent" />
            </div>
        );

    return (
        <div className="space-y-6 max-w-xl">
            <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
                <p className="text-xs text-accent/80 leading-relaxed">
                    Impersonation generates a short-lived token (2 hours) that lets you
                    view the main app as a specific staff member or policyholder. All
                    actions taken during impersonation are logged in the audit trail.
                </p>
            </div>

            <div className="flex gap-1 bg-card rounded-lg p-1 w-fit">
                <button
                    onClick={() => { setMode("staff"); setResult(null); setError(""); }}
                    className={`px-4 py-2 text-xs font-medium rounded-md transition-all ${
                        mode === "staff" ? "bg-surface text-heading" : "text-muted hover:text-body"
                    }`}
                >
                    Staff
                </button>
                <button
                    onClick={() => { setMode("policyholder"); setResult(null); setError(""); }}
                    className={`px-4 py-2 text-xs font-medium rounded-md transition-all ${
                        mode === "policyholder" ? "bg-surface text-heading" : "text-muted hover:text-body"
                    }`}
                >
                    Policyholder
                </button>
            </div>

            {mode === "staff" && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-secondary mb-1.5">Staff User</label>
                        <select
                            value={selectedStaff}
                            onChange={(e) => setSelectedStaff(e.target.value)}
                            className="w-full px-3 py-2.5 bg-surface border border-input-border rounded-lg text-sm text-heading focus:outline-none focus:border-accent/50"
                        >
                            <option value="">Auto-select (first admin)</option>
                            {staffList.map((s: any) => (
                                <option key={s.id} value={s.id}>
                                    {s.name || s.email} ({s.role})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-secondary mb-1.5">View As Role</label>
                        <select
                            value={staffRole}
                            onChange={(e) => setStaffRole(e.target.value)}
                            className="w-full px-3 py-2.5 bg-surface border border-input-border rounded-lg text-sm text-heading focus:outline-none focus:border-accent/50"
                        >
                            <option value="admin">Admin</option>
                            <option value="staff">Staff</option>
                        </select>
                    </div>
                </div>
            )}

            {mode === "policyholder" && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-secondary mb-1.5">Policy Number</label>
                        {phList.length > 0 ? (
                            <select
                                value={policyNumber}
                                onChange={(e) => setPolicyNumber(e.target.value)}
                                className="w-full px-3 py-2.5 bg-surface border border-input-border rounded-lg text-sm text-heading focus:outline-none focus:border-accent/50"
                            >
                                <option value="">Select a policyholder</option>
                                {phList.map((ph: any) => (
                                    <option key={ph.id} value={ph.policy_number}>
                                        {ph.policy_number} — {ph.last_name || ph.company_name || "N/A"}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                value={policyNumber}
                                onChange={(e) => setPolicyNumber(e.target.value)}
                                placeholder="Enter policy number"
                                className="w-full px-3 py-2.5 bg-surface border border-input-border rounded-lg text-sm text-heading focus:outline-none focus:border-accent/50"
                            />
                        )}
                    </div>
                </div>
            )}

            {error && (
                <div className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                    {error}
                </div>
            )}

            <button
                onClick={handleImpersonate}
                disabled={loading}
                className="px-5 py-2.5 bg-accent text-on-accent text-sm font-semibold rounded-lg hover:bg-accent-hover disabled:opacity-50"
            >
                {loading ? "Generating..." : "Generate Token"}
            </button>

            {result && (
                <div className="bg-card border border-border-default rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="text-emerald-400 text-sm">✓</span>
                        <span className="text-sm text-heading font-medium">Token Generated</span>
                    </div>

                    <div className="space-y-2 text-xs text-secondary">
                        <div className="flex justify-between">
                            <span>Impersonating</span>
                            <span className="text-heading">{result.user_identifier}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Type</span>
                            <span className="text-heading capitalize">{result.impersonating}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Role</span>
                            <span className="text-heading capitalize">{result.role}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Expires</span>
                            <span className="text-heading">{result.expires_in_hours} hours</span>
                        </div>
                        {result.tenant_slug && (
                            <div className="flex justify-between">
                                <span>App URL</span>
                                <span className="text-heading">{result.tenant_slug}.agencylensai.com</span>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={openAsUser}
                            className="flex-1 px-4 py-2 bg-accent text-on-accent text-xs font-semibold rounded-lg hover:bg-accent-hover"
                        >
                            Open as {result.impersonating === "staff" ? "Staff" : "Policyholder"}
                        </button>
                        <button
                            onClick={copyToken}
                            className="px-4 py-2 border border-input-border text-secondary text-xs rounded-lg hover:bg-surface"
                        >
                            {copied ? "Copied!" : "Copy Token"}
                        </button>
                    </div>

                    <p className="text-[11px] text-faint leading-relaxed">{result.notice}</p>
                </div>
            )}
        </div>
    );
}

export default ImpersonationTab;
