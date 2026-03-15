/**
 * Superadmin API functions — COMPLETE FILE.
 *
 * Covers: auth, tenants, audit, staff mgmt, policyholder mgmt, document mgmt,
 * widget config, impersonation, billing, notifications, onboarding, RAG config,
 * compliance, support, analytics, system health, superadmin account management,
 * and plan configuration editing.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

function getHeaders(token: string): HeadersInit {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
}

async function handleResponse(res: Response) {
    if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: res.statusText }));
        if (Array.isArray(body.detail)) {
            const messages = body.detail.map((e: any) => e.msg || JSON.stringify(e)).join("; ");
            throw new Error(messages);
        }
        throw new Error(body.detail || body.error || `Request failed: ${res.status}`);
    }
    return res.json();
}

// ── Auth ────────────────────────────────────────────────────────────────

export async function superadminSetup(email: string, name: string, password: string) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/auth/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password }),
    });
    return handleResponse(res);
}

export async function superadminLogin(email: string, password: string) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
}

export async function getSuperadminProfile(token: string) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/auth/me`, {
        headers: getHeaders(token),
    });
    return handleResponse(res);
}

// ── Platform Stats ──────────────────────────────────────────────────────

export async function getPlatformStats(token: string) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/stats`, {
        headers: getHeaders(token),
    });
    return handleResponse(res);
}

// ── Tenants ─────────────────────────────────────────────────────────────

export async function listTenants(
    token: string,
    params: { page?: number; page_size?: number; status?: string; search?: string } = {}
) {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.page_size) qs.set("page_size", String(params.page_size));
    if (params.status) qs.set("status", params.status);
    if (params.search) qs.set("search", params.search);

    const res = await fetch(`${API_URL}/api/v1/superadmin/tenants?${qs}`, {
        headers: getHeaders(token),
    });
    return handleResponse(res);
}

export async function getTenant(token: string, tenantId: string) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/tenants/${tenantId}`, {
        headers: getHeaders(token),
    });
    return handleResponse(res);
}

export async function createTenant(
    token: string,
    data: { name: string; slug: string; status?: string }
) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/tenants`, {
        method: "POST",
        headers: getHeaders(token),
        body: JSON.stringify(data),
    });
    return handleResponse(res);
}

export async function updateTenant(
    token: string,
    tenantId: string,
    data: { name?: string; slug?: string; widget_config?: Record<string, unknown> }
) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/tenants/${tenantId}`, {
        method: "PUT",
        headers: getHeaders(token),
        body: JSON.stringify(data),
    });
    return handleResponse(res);
}

export async function updateTenantStatus(
    token: string,
    tenantId: string,
    status: string,
    reason?: string
) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/tenants/${tenantId}/status`, {
        method: "PATCH",
        headers: getHeaders(token),
        body: JSON.stringify({ status, reason }),
    });
    return handleResponse(res);
}

// ── Audit Logs ──────────────────────────────────────────────────────────

export async function listAuditLogs(
    token: string,
    params: { page?: number; page_size?: number; action?: string; resource_type?: string } = {}
) {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.page_size) qs.set("page_size", String(params.page_size));
    if (params.action) qs.set("action", params.action);
    if (params.resource_type) qs.set("resource_type", params.resource_type);

    const res = await fetch(`${API_URL}/api/v1/superadmin/audit-logs?${qs}`, {
        headers: getHeaders(token),
    });
    return handleResponse(res);
}

// ── Staff Management ────────────────────────────────────────────────────

export async function listStaff(
    token: string,
    tenantId: string,
    params: {
        page?: number;
        page_size?: number;
        search?: string;
        role?: string;
        is_active?: boolean;
        show_deleted?: boolean;
        sort_by?: string;
        sort_order?: string;
    } = {}
) {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.page_size) qs.set("page_size", String(params.page_size));
    if (params.search) qs.set("search", params.search);
    if (params.role) qs.set("role", params.role);
    if (params.is_active !== undefined) qs.set("is_active", String(params.is_active));
    if (params.show_deleted) qs.set("show_deleted", "true");
    if (params.sort_by) qs.set("sort_by", params.sort_by);
    if (params.sort_order) qs.set("sort_order", params.sort_order);

    const res = await fetch(`${API_URL}/api/v1/superadmin/tenants/${tenantId}/staff?${qs}`, {
        headers: getHeaders(token),
    });
    return handleResponse(res);
}

export async function createStaff(
    token: string,
    tenantId: string,
    data: { email: string; name: string; role?: string }
) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/tenants/${tenantId}/staff`, {
        method: "POST",
        headers: getHeaders(token),
        body: JSON.stringify(data),
    });
    return handleResponse(res);
}

export async function updateStaff(
    token: string,
    tenantId: string,
    staffId: string,
    data: { name?: string; role?: string; email?: string }
) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/tenants/${tenantId}/staff/${staffId}`, {
        method: "PUT",
        headers: getHeaders(token),
        body: JSON.stringify(data),
    });
    return handleResponse(res);
}

export async function updateStaffStatus(
    token: string,
    tenantId: string,
    staffId: string,
    isActive: boolean
) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/tenants/${tenantId}/staff/${staffId}/status`, {
        method: "PATCH",
        headers: getHeaders(token),
        body: JSON.stringify({ is_active: isActive }),
    });
    return handleResponse(res);
}

export async function deleteStaff(token: string, tenantId: string, staffId: string) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/tenants/${tenantId}/staff/${staffId}`, {
        method: "DELETE",
        headers: getHeaders(token),
    });
    return handleResponse(res);
}

export async function resetStaffPassword(token: string, tenantId: string, staffId: string) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/tenants/${tenantId}/staff/${staffId}/reset-password`, {
        method: "POST",
        headers: getHeaders(token),
    });
    return handleResponse(res);
}

// ── Policyholder Management ─────────────────────────────────────────────

export async function listPolicyholders(
    token: string,
    tenantId: string,
    params: { page?: number; page_size?: number; search?: string; is_active?: boolean } = {}
) {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.page_size) qs.set("page_size", String(params.page_size));
    if (params.search) qs.set("search", params.search);
    if (params.is_active !== undefined) qs.set("is_active", String(params.is_active));

    const res = await fetch(`${API_URL}/api/v1/superadmin/tenants/${tenantId}/policyholders?${qs}`, {
        headers: getHeaders(token),
    });
    return handleResponse(res);
}

export async function createPolicyholder(
    token: string,
    tenantId: string,
    data: { policy_number: string; last_name?: string; company_name?: string }
) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/tenants/${tenantId}/policyholders`, {
        method: "POST",
        headers: getHeaders(token),
        body: JSON.stringify(data),
    });
    return handleResponse(res);
}

export async function updatePolicyholder(
    token: string,
    tenantId: string,
    phId: string,
    data: { policy_number?: string; last_name?: string; company_name?: string }
) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/tenants/${tenantId}/policyholders/${phId}`, {
        method: "PUT",
        headers: getHeaders(token),
        body: JSON.stringify(data),
    });
    return handleResponse(res);
}

export async function updatePolicyholderStatus(
    token: string,
    tenantId: string,
    phId: string,
    isActive: boolean
) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/tenants/${tenantId}/policyholders/${phId}/status`, {
        method: "PATCH",
        headers: getHeaders(token),
        body: JSON.stringify({ is_active: isActive }),
    });
    return handleResponse(res);
}

export async function bulkImportPolicyholders(
    token: string,
    tenantId: string,
    policyholders: Array<{ policy_number: string; last_name?: string; company_name?: string }>
) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/tenants/${tenantId}/policyholders/bulk-import`, {
        method: "POST",
        headers: getHeaders(token),
        body: JSON.stringify({ policyholders }),
    });
    return handleResponse(res);
}

// ── Document Management ─────────────────────────────────────────────────

export async function listDocuments(
    token: string,
    tenantId: string,
    params: {
        page?: number;
        page_size?: number;
        document_type?: string;
        status?: string;
        search?: string;
    } = {}
) {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.page_size) qs.set("page_size", String(params.page_size));
    if (params.document_type) qs.set("document_type", params.document_type);
    if (params.status) qs.set("status", params.status);
    if (params.search) qs.set("search", params.search);

    const res = await fetch(`${API_URL}/api/v1/superadmin/tenants/${tenantId}/documents?${qs}`, {
        headers: getHeaders(token),
    });
    return handleResponse(res);
}

export async function getDocumentStats(token: string, tenantId: string) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/tenants/${tenantId}/documents/stats`, {
        headers: getHeaders(token),
    });
    return handleResponse(res);
}

export async function getDocument(token: string, tenantId: string, docId: string) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/tenants/${tenantId}/documents/${docId}`, {
        headers: getHeaders(token),
    });
    return handleResponse(res);
}

export async function deleteDocument(token: string, tenantId: string, docId: string) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/tenants/${tenantId}/documents/${docId}`, {
        method: "DELETE",
        headers: getHeaders(token),
    });
    return handleResponse(res);
}

// ── Widget Config ───────────────────────────────────────────────────────

export async function getWidgetConfig(token: string, tenantId: string) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/tenants/${tenantId}/widget-config`, {
        headers: getHeaders(token),
    });
    return handleResponse(res);
}

export async function updateWidgetConfig(
    token: string,
    tenantId: string,
    data: {
        primary_color?: string;
        header_text?: string;
        welcome_message?: string;
        placeholder_text?: string;
        disclaimer_text?: string;
        disclaimer_enabled?: boolean;
        logo_url?: string;
        position?: string;
    }
) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/tenants/${tenantId}/widget-config`, {
        method: "PUT",
        headers: getHeaders(token),
        body: JSON.stringify(data),
    });
    return handleResponse(res);
}

export async function resetWidgetConfig(token: string, tenantId: string) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/tenants/${tenantId}/widget-config/reset`, {
        method: "POST",
        headers: getHeaders(token),
    });
    return handleResponse(res);
}

// ── Impersonation ───────────────────────────────────────────────────────

export async function impersonateStaff(
    token: string,
    tenantId: string,
    data: { staff_id?: string; role?: string } = {}
) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/tenants/${tenantId}/impersonate/staff`, {
        method: "POST",
        headers: getHeaders(token),
        body: JSON.stringify(data),
    });
    return handleResponse(res);
}

export async function impersonatePolicyholder(
    token: string,
    tenantId: string,
    data: { policy_number: string }
) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/tenants/${tenantId}/impersonate/policyholder`, {
        method: "POST",
        headers: getHeaders(token),
        body: JSON.stringify(data),
    });
    return handleResponse(res);
}

// ── Billing & Usage ─────────────────────────────────────────────────────

export async function listPlans(token: string) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/plans`, { headers: getHeaders(token) });
    return handleResponse(res);
}

export async function assignPlan(token: string, tenantId: string, plan: string) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/tenants/${tenantId}/plan`, {
        method: "PATCH", headers: getHeaders(token), body: JSON.stringify({ plan }),
    });
    return handleResponse(res);
}

export async function getTenantUsage(token: string, tenantId: string, period?: string) {
    const qs = period ? `?period=${period}` : "";
    const res = await fetch(`${API_URL}/api/v1/superadmin/tenants/${tenantId}/usage${qs}`, {
        headers: getHeaders(token),
    });
    return handleResponse(res);
}

export async function getPlatformUsageSummary(token: string) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/usage-summary`, { headers: getHeaders(token) });
    return handleResponse(res);
}

// ── Notifications ───────────────────────────────────────────────────────

export async function listNotifications(
    token: string,
    params: { page?: number; page_size?: number; notification_type?: string; is_active?: boolean } = {}
) {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.page_size) qs.set("page_size", String(params.page_size));
    if (params.notification_type) qs.set("notification_type", params.notification_type);
    if (params.is_active !== undefined) qs.set("is_active", String(params.is_active));

    const res = await fetch(`${API_URL}/api/v1/superadmin/notifications?${qs}`, {
        headers: getHeaders(token),
    });
    return handleResponse(res);
}

export async function createNotification(token: string, data: any) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/notifications`, {
        method: "POST", headers: getHeaders(token), body: JSON.stringify(data),
    });
    return handleResponse(res);
}

export async function updateNotification(token: string, notifId: string, data: any) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/notifications/${notifId}`, {
        method: "PUT", headers: getHeaders(token), body: JSON.stringify(data),
    });
    return handleResponse(res);
}

export async function deleteNotification(token: string, notifId: string) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/notifications/${notifId}`, {
        method: "DELETE", headers: getHeaders(token),
    });
    return handleResponse(res);
}

// ── Onboarding ──────────────────────────────────────────────────────────

export async function getOnboardingStatus(token: string, tenantId: string) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/tenants/${tenantId}/onboarding`, {
        headers: getHeaders(token),
    });
    return handleResponse(res);
}

export async function updateOnboardingStep(token: string, tenantId: string, stepKey: string, completed: boolean) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/tenants/${tenantId}/onboarding`, {
        method: "PATCH", headers: getHeaders(token),
        body: JSON.stringify({ step_key: stepKey, completed }),
    });
    return handleResponse(res);
}

// ── RAG Configuration ───────────────────────────────────────────────────

export async function getRAGConfig(token: string) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/rag-config`, { headers: getHeaders(token) });
    return handleResponse(res);
}

export async function updateRAGConfig(token: string, data: any) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/rag-config`, {
        method: "PUT", headers: getHeaders(token), body: JSON.stringify(data),
    });
    return handleResponse(res);
}

// ── Compliance / Disclaimer ─────────────────────────────────────────────

export async function getDisclaimer(token: string, tenantId: string) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/tenants/${tenantId}/disclaimer`, {
        headers: getHeaders(token),
    });
    return handleResponse(res);
}

export async function updateDisclaimer(token: string, tenantId: string, data: any) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/tenants/${tenantId}/disclaimer`, {
        method: "PUT", headers: getHeaders(token), body: JSON.stringify(data),
    });
    return handleResponse(res);
}

// ── Support ─────────────────────────────────────────────────────────────

export async function lookupQueries(token: string, params: any = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) qs.set(k, String(v)); });

    const res = await fetch(`${API_URL}/api/v1/superadmin/support/queries?${qs}`, {
        headers: getHeaders(token),
    });
    return handleResponse(res);
}

export async function debugVerification(token: string, tenantId: string, policyNumber: string) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/support/debug-verification/${tenantId}/${policyNumber}`, {
        headers: getHeaders(token),
    });
    return handleResponse(res);
}

// ── Analytics ───────────────────────────────────────────────────────────

export async function getPlatformAnalytics(token: string) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/analytics`, { headers: getHeaders(token) });
    return handleResponse(res);
}

export async function getTenantAnalytics(token: string, tenantId: string) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/analytics/tenants/${tenantId}`, {
        headers: getHeaders(token),
    });
    return handleResponse(res);
}

// ── System Health ───────────────────────────────────────────────────────

export async function getSystemHealth(token: string) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/health`, { headers: getHeaders(token) });
    return handleResponse(res);
}

// ═══════════════════════════════════════════════════════════════════════════
// NEW: Superadmin Account Management
// ═══════════════════════════════════════════════════════════════════════════

export async function listSuperadmins(
    token: string,
    params: { search?: string; is_active?: boolean } = {}
) {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.is_active !== undefined) qs.set("is_active", String(params.is_active));

    const res = await fetch(`${API_URL}/api/v1/superadmin/admins?${qs}`, {
        headers: getHeaders(token),
    });
    return handleResponse(res);
}

export async function createSuperadmin(
    token: string,
    data: { email: string; name: string; password: string }
) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/admins`, {
        method: "POST",
        headers: getHeaders(token),
        body: JSON.stringify(data),
    });
    return handleResponse(res);
}

export async function updateSuperadmin(
    token: string,
    adminId: string,
    data: { name?: string; email?: string }
) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/admins/${adminId}`, {
        method: "PUT",
        headers: getHeaders(token),
        body: JSON.stringify(data),
    });
    return handleResponse(res);
}

export async function changeSuperadminPassword(
    token: string,
    adminId: string,
    data: { current_password: string; new_password: string }
) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/admins/${adminId}/change-password`, {
        method: "POST",
        headers: getHeaders(token),
        body: JSON.stringify(data),
    });
    return handleResponse(res);
}

export async function toggleSuperadminStatus(
    token: string,
    adminId: string,
    isActive: boolean
) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/admins/${adminId}/status`, {
        method: "PATCH",
        headers: getHeaders(token),
        body: JSON.stringify({ is_active: isActive }),
    });
    return handleResponse(res);
}

// ═══════════════════════════════════════════════════════════════════════════
// NEW: Plan Configuration Editing
// ═══════════════════════════════════════════════════════════════════════════

export async function updatePlanConfig(
    token: string,
    planKey: string,
    data: {
        query_limit_monthly?: number;
        document_limit?: number;
        staff_limit?: number;
        policyholder_limit?: number;
        features?: string[];
    }
) {
    const res = await fetch(`${API_URL}/api/v1/superadmin/plans/${planKey}`, {
        method: "PATCH",
        headers: getHeaders(token),
        body: JSON.stringify(data),
    });
    return handleResponse(res);
}