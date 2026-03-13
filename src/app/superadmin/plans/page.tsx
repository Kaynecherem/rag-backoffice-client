"use client";

import { useEffect, useState } from "react";
import { useSuperAdminAuth } from "@/lib/superadmin-auth-context";
import { listPlans } from "@/lib/superadmin-api";

// ── Feature display names ───────────────────────────────────────────────

const FEATURE_LABELS: Record<string, { name: string; description: string }> = {
    widget: {
        name: "Embeddable Widget",
        description: "Chat widget for policyholder self-service on the agency's website",
    },
    batch_upload: {
        name: "Batch Upload",
        description: "Upload multiple policy documents or communications in a single request",
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

// ── Plan order and accent colors ────────────────────────────────────────

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

// ── Helper ──────────────────────────────────────────────────────────────

function formatLimit(value: number): string {
    if (value === 0) return "Unlimited";
    return value.toLocaleString();
}

// ── Page Component ──────────────────────────────────────────────────────

export default function PlansPage() {
    const { user } = useSuperAdminAuth();
    const [plans, setPlans] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        listPlans(user.token)
            .then((data) => setPlans(data))
            .catch((err) => setError(err.message || "Failed to load plans"))
            .finally(() => setLoading(false));
    }, [user]);

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-6xl mx-auto px-6 py-8">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
                    {error}
                </div>
            </div>
        );
    }

    const orderedPlans = PLAN_ORDER.filter((key) => plans[key]).map((key) => ({
        key,
        ...plans[key],
    }));

    return (
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-white">Plans & Pricing</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Overview of all available plans and their limits. Assign plans to tenants from their Billing tab.
                </p>
            </div>

            {/* Plan Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {orderedPlans.map((plan) => {
                    const accent = PLAN_ACCENTS[plan.key] || PLAN_ACCENTS.trial;
                    return (
                        <div
                            key={plan.key}
                            className={`rounded-xl border ${accent.border} ${accent.bg} p-5 flex flex-col`}
                        >
                            {/* Plan name */}
                            <div className="flex items-center justify-between mb-4">
                <span
                    className={`text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${accent.badge}`}
                >
                  {plan.name}
                </span>
                                {plan.key === "professional" && (
                                    <span className="text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                    Popular
                  </span>
                                )}
                            </div>

                            {/* Limits */}
                            <div className="space-y-3 flex-1">
                                <LimitRow
                                    label="Queries / month"
                                    value={plan.query_limit_monthly}
                                    accent={accent.text}
                                />
                                <LimitRow
                                    label="Documents"
                                    value={plan.document_limit}
                                    accent={accent.text}
                                />
                                <LimitRow
                                    label="Staff users"
                                    value={plan.staff_limit}
                                    accent={accent.text}
                                />
                                <LimitRow
                                    label="Policyholders"
                                    value={plan.policyholder_limit}
                                    accent={accent.text}
                                />
                            </div>

                            {/* Features */}
                            <div className="mt-5 pt-4 border-t border-gray-800">
                                <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">
                                    Features
                                </div>
                                <div className="space-y-1.5">
                                    {ALL_FEATURES.map((feat) => {
                                        const included = plan.features?.includes(feat);
                                        return (
                                            <div key={feat} className="flex items-center gap-2">
                                                {included ? (
                                                    <svg
                                                        className={`w-3.5 h-3.5 ${accent.text}`}
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                        strokeWidth={2.5}
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d="M5 13l4 4L19 7"
                                                        />
                                                    </svg>
                                                ) : (
                                                    <svg
                                                        className="w-3.5 h-3.5 text-gray-700"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                        strokeWidth={2}
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d="M6 18L18 6M6 6l12 12"
                                                        />
                                                    </svg>
                                                )}
                                                <span
                                                    className={`text-xs ${
                                                        included ? "text-gray-300" : "text-gray-700"
                                                    }`}
                                                >
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

            {/* Detailed Comparison Table */}
            <div>
                <h2 className="text-sm font-semibold text-white mb-3">Detailed Comparison</h2>
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                        <tr className="border-b border-gray-800">
                            <th className="text-left text-xs text-gray-500 font-medium px-5 py-3 w-1/3">
                                Limit
                            </th>
                            {orderedPlans.map((plan) => (
                                <th
                                    key={plan.key}
                                    className={`text-center text-xs font-medium px-4 py-3 ${
                                        PLAN_ACCENTS[plan.key]?.text || "text-gray-400"
                                    }`}
                                >
                                    {plan.name}
                                </th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        <ComparisonRow
                            label="Monthly queries"
                            values={orderedPlans.map((p) => p.query_limit_monthly)}
                        />
                        <ComparisonRow
                            label="Total documents"
                            values={orderedPlans.map((p) => p.document_limit)}
                        />
                        <ComparisonRow
                            label="Staff users"
                            values={orderedPlans.map((p) => p.staff_limit)}
                        />
                        <ComparisonRow
                            label="Policyholders"
                            values={orderedPlans.map((p) => p.policyholder_limit)}
                        />
                        {ALL_FEATURES.map((feat) => (
                            <tr key={feat} className="border-t border-gray-800/50">
                                <td className="px-5 py-2.5 text-gray-400 text-xs">
                                    {FEATURE_LABELS[feat]?.name || feat}
                                </td>
                                {orderedPlans.map((plan) => (
                                    <td key={plan.key} className="text-center px-4 py-2.5">
                                        {plan.features?.includes(feat) ? (
                                            <span
                                                className={`text-sm ${
                                                    PLAN_ACCENTS[plan.key]?.text || "text-gray-400"
                                                }`}
                                            >
                          ✓
                        </span>
                                        ) : (
                                            <span className="text-gray-700 text-sm">—</span>
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Feature Descriptions */}
            <div>
                <h2 className="text-sm font-semibold text-white mb-3">Feature Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {ALL_FEATURES.map((feat) => {
                        const info = FEATURE_LABELS[feat];
                        if (!info) return null;
                        return (
                            <div
                                key={feat}
                                className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3"
                            >
                                <div className="text-xs font-medium text-white">{info.name}</div>
                                <div className="text-xs text-gray-500 mt-1">{info.description}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ── Sub-components ──────────────────────────────────────────────────────

function LimitRow({
                      label,
                      value,
                      accent,
                  }: {
    label: string;
    value: number;
    accent: string;
}) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{label}</span>
            <span className={`text-sm font-semibold ${value === 0 ? accent : "text-white"}`}>
        {formatLimit(value)}
      </span>
        </div>
    );
}

function ComparisonRow({ label, values }: { label: string; values: number[] }) {
    return (
        <tr className="border-t border-gray-800/50">
            <td className="px-5 py-2.5 text-gray-400 text-xs">{label}</td>
            {values.map((val, i) => (
                <td key={i} className="text-center px-4 py-2.5 text-xs text-white">
                    {formatLimit(val)}
                </td>
            ))}
        </tr>
    );
}