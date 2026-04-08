"use client";

import { useEffect, useState } from "react";
import { useSuperAdminAuth } from "@/lib/superadmin-auth-context";
import { listPlans, updatePlanConfig } from "@/lib/superadmin-api";

// ── Feature display names ───────────────────────────────────────────────

const FEATURE_LABELS: Record<string, { name: string; description: string }> = {
    widget: {
        name: "Embeddable Widget",
        description: "Chat widget for policyholder self-service on the agency's website",
    },
    batch_upload: {
        name: "Batch Upload",
        description: "Upload multiple communication documents in a single request (policy batch upload is always available)",
    },
    api_access: {
        name: "API Access",
        description: "Direct API access for custom integrations and automation",
    },
    custom_model: {
        name: "Custom Model",
        description: "Dedicated LLM fine-tuned on the agency's specific documents and terminology",
    },
};

const ALL_FEATURES = ["widget", "batch_upload", "api_access", "custom_model"];

const PLAN_ORDER = ["trial", "starter", "professional", "enterprise"];

const PLAN_ACCENTS: Record<string, { border: string; bg: string; badge: string; text: string }> = {
    trial: {
        border: "border-gray-700",
        bg: "bg-gray-800/30",
        badge: "bg-gray-700 text-gray-300",
        text: "text-gray-400",
    },
    starter: {
        border: "border-blue-500/30",
        bg: "bg-blue-500/5",
        badge: "bg-blue-500/20 text-blue-400",
        text: "text-blue-400",
    },
    professional: {
        border: "border-amber-400/30",
        bg: "bg-amber-400/5",
        badge: "bg-amber-400/20 text-amber-400",
        text: "text-amber-400",
    },
    enterprise: {
        border: "border-emerald-400/30",
        bg: "bg-emerald-400/5",
        badge: "bg-emerald-400/20 text-emerald-400",
        text: "text-emerald-400",
    },
};

function formatLimit(value: number): string {
    if (value === 0) return "Unlimited";
    return value.toLocaleString();
}

export default function PlansPage() {
    const { user } = useSuperAdminAuth();
    const [plans, setPlans] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [editingPlan, setEditingPlan] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        listPlans(user.token)
            .then((data) => setPlans(data))
            .catch((err) => setError(err.message || "Failed to load plans"))
            .finally(() => setLoading(false));
    }, [user]);

    const startEdit = (key: string, plan: any) => {
        setEditingPlan(key);
        setEditForm({
            query_limit_monthly: plan.query_limit_monthly,
            document_limit: plan.document_limit,
            staff_limit: plan.staff_limit,
            policyholder_limit: plan.policyholder_limit,
            features: [...(plan.features || [])],
        });
    };

    const cancelEdit = () => {
        setEditingPlan(null);
        setEditForm({});
    };

    const handleSave = async () => {
        if (!user || !editingPlan) return;
        setSaving(true);
        setError("");
        try {
            const result = await updatePlanConfig(user.token, editingPlan, editForm);
            // Merge updated plan back
            const updatedPlanData = result[editingPlan];
            setPlans((prev) => ({ ...prev, [editingPlan]: updatedPlanData }));
            setEditingPlan(null);
            setSuccess(`Plan "${editingPlan}" updated successfully`);
            setTimeout(() => setSuccess(""), 3000);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to update plan");
        } finally {
            setSaving(false);
        }
    };

    const toggleFeature = (feat: string) => {
        setEditForm((prev: any) => {
            const features = [...(prev.features || [])];
            const idx = features.indexOf(feat);
            if (idx >= 0) features.splice(idx, 1);
            else features.push(feat);
            return { ...prev, features };
        });
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent" />
            </div>
        );
    }

    const orderedPlans = PLAN_ORDER.filter((key) => plans[key]).map((key) => ({
        key,
        ...plans[key],
    }));

    return (
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
            <div>
                <h1 className="text-xl font-bold text-heading">Plans & Pricing</h1>
                <p className="text-sm text-muted mt-1">
                    Configure plan limits and features. Policy documents are unlimited on all plans. Click &ldquo;Edit&rdquo; to modify a plan.
                </p>
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

            {/* Info Banner */}
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                <p className="text-xs text-blue-400/80 leading-relaxed">
                    <strong>Policy documents and policyholders are unlimited</strong> on all plans. The &ldquo;Documents&rdquo; limit below only applies to communication documents (letters, notes, E&O records). Batch upload for policy documents is always available regardless of plan.
                </p>
            </div>

            {/* Plan Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {orderedPlans.map((plan) => {
                    const accent = PLAN_ACCENTS[plan.key] || PLAN_ACCENTS.trial;
                    const isEditing = editingPlan === plan.key;

                    return (
                        <div
                            key={plan.key}
                            className={`rounded-xl border ${accent.border} ${accent.bg} p-5 flex flex-col`}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <span className={`text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${accent.badge}`}>
                                    {plan.name}
                                </span>
                                {!isEditing ? (
                                    <button
                                        onClick={() => startEdit(plan.key, plan)}
                                        className="text-[10px] text-muted hover:text-accent transition"
                                    >
                                        Edit
                                    </button>
                                ) : (
                                    <div className="flex gap-1">
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="text-[10px] text-accent hover:text-accent-hover font-medium"
                                        >
                                            {saving ? "..." : "Save"}
                                        </button>
                                        <button
                                            onClick={cancelEdit}
                                            className="text-[10px] text-muted hover:text-body"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Limits */}
                            <div className="space-y-3 flex-1">
                                <EditableLimitRow
                                    label="Queries / month"
                                    value={isEditing ? editForm.query_limit_monthly : plan.query_limit_monthly}
                                    accent={accent.text}
                                    editing={isEditing}
                                    onChange={(v) => setEditForm((p: any) => ({ ...p, query_limit_monthly: v }))}
                                />
                                <EditableLimitRow
                                    label="Comm. Documents"
                                    value={isEditing ? editForm.document_limit : plan.document_limit}
                                    accent={accent.text}
                                    editing={isEditing}
                                    onChange={(v) => setEditForm((p: any) => ({ ...p, document_limit: v }))}
                                />
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted">Policy Documents</span>
                                    <span className="text-sm font-semibold text-emerald-400">Unlimited</span>
                                </div>
                                <EditableLimitRow
                                    label="Staff users"
                                    value={isEditing ? editForm.staff_limit : plan.staff_limit}
                                    accent={accent.text}
                                    editing={isEditing}
                                    onChange={(v) => setEditForm((p: any) => ({ ...p, staff_limit: v }))}
                                />
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted">Policyholders</span>
                                    <span className="text-sm font-semibold text-emerald-400">Unlimited</span>
                                </div>
                            </div>

                            {/* Features */}
                            <div className="mt-5 pt-4 border-t border-border-default">
                                <div className="text-[10px] text-faint uppercase tracking-wider mb-2">
                                    Features
                                </div>
                                <div className="space-y-1.5">
                                    {ALL_FEATURES.map((feat) => {
                                        const currentFeatures = isEditing ? editForm.features : (plan.features || []);
                                        const included = currentFeatures.includes(feat);
                                        return (
                                            <div key={feat} className="flex items-center gap-2">
                                                {isEditing ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleFeature(feat)}
                                                        className={`text-sm ${included ? accent.text : "text-faint"}`}
                                                    >
                                                        {included ? "✓" : "○"}
                                                    </button>
                                                ) : included ? (
                                                    <span className={`text-sm ${accent.text}`}>✓</span>
                                                ) : (
                                                    <span className="text-faint text-sm">—</span>
                                                )}
                                                <span className={`text-xs ${included ? "text-body" : "text-faint"}`}>
                                                    {FEATURE_LABELS[feat]?.name || feat}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Feature Descriptions */}
            <div>
                <h2 className="text-sm font-semibold text-heading mb-3">Feature Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {ALL_FEATURES.map((feat) => {
                        const info = FEATURE_LABELS[feat];
                        if (!info) return null;
                        return (
                            <div key={feat} className="bg-card border border-border-default rounded-lg px-4 py-3">
                                <div className="text-xs font-medium text-heading">{info.name}</div>
                                <div className="text-xs text-muted mt-1">{info.description}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function EditableLimitRow({
                              label,
                              value,
                              accent,
                              editing,
                              onChange,
                          }: {
    label: string;
    value: number;
    accent: string;
    editing: boolean;
    onChange: (val: number) => void;
}) {
    if (editing) {
        return (
            <div className="flex items-center justify-between">
                <span className="text-xs text-muted">{label}</span>
                <input
                    type="number"
                    min={0}
                    value={value}
                    onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                    className="w-24 text-right px-2 py-1 bg-surface border border-input-border rounded text-xs text-heading focus:outline-none focus:border-accent/50"
                />
            </div>
        );
    }
    return (
        <div className="flex items-center justify-between">
            <span className="text-xs text-muted">{label}</span>
            <span className={`text-sm font-semibold ${value === 0 ? accent : "text-heading"}`}>
                {formatLimit(value)}
            </span>
        </div>
    );
}
