"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SuperAdminAuthProvider, useSuperAdminAuth } from "@/lib/superadmin-auth-context";
import { useTheme } from "@/components/ThemeProvider";

function SuperAdminShell({ children }: { children: React.ReactNode }) {
  const { user, hydrated, logout } = useSuperAdminAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (hydrated && !user && pathname !== "/superadmin/login") {
      router.replace("/superadmin/login");
    }
  }, [hydrated, user, pathname, router]);

  if (!hydrated) {
    return (
        <div className="h-screen flex items-center justify-center bg-page">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
        </div>
    );
  }

  if (pathname === "/superadmin/login") return <>{children}</>;
  if (!user) return null;

  const navItems = [
    { label: "Dashboard", href: "/superadmin", icon: "◆" },
    { label: "Tenants", href: "/superadmin/tenants", icon: "▣" },
    { label: "Plans", href: "/superadmin/plans", icon: "▦" },
    { label: "Admins", href: "/superadmin/admins", icon: "♛" },
    { label: "Analytics", href: "/superadmin/analytics", icon: "◈" },
    { label: "Notifications", href: "/superadmin/notifications", icon: "▢" },
    { label: "RAG Pipeline", href: "/superadmin/rag-config", icon: "◇" },
    { label: "System", href: "/superadmin/system", icon: "⚙" },
    { label: "Support", href: "/superadmin/support", icon: "◎" },
    { label: "Audit Log", href: "/superadmin/audit", icon: "▤" },
  ];

  const isActive = (href: string) => {
    if (href === "/superadmin") return pathname === "/superadmin";
    return pathname.startsWith(href);
  };

  return (
      <div className="h-screen flex overflow-hidden bg-page text-body">
        <aside className="w-60 flex-shrink-0 bg-card border-r border-border-default flex flex-col">
          <div className="p-5 border-b border-border-default">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                  src={theme === "dark" ? "/patch-premium-finance-logo-dark.svg" : "/patch-premium-finance-logo.svg"}
                  alt="Patch Premium Finance"
                  style={{ height: '40px', width: 'auto' }}
                  className="flex-shrink-0"
              />
            </div>
            <div className="text-[10px] text-muted mt-2">Superadmin</div>
          </div>

          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
                <button
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                        isActive(item.href)
                            ? "bg-accent/10 text-accent font-medium"
                            : "text-secondary hover:text-heading hover:bg-surface/60"
                    }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </button>
            ))}
          </nav>

          <div className="p-4 border-t border-border-default space-y-3">
            {/* Theme toggle */}
            <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-2 text-xs text-secondary hover:text-heading transition-colors"
            >
              {theme === "dark" ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
            <div className="text-xs text-muted truncate">{user.email}</div>
            <button
                onClick={() => { logout(); router.replace("/superadmin/login"); }}
                className="w-full text-left text-xs text-secondary hover:text-red-500 transition-colors"
            >
              Sign out
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
  );
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
      <SuperAdminAuthProvider>
        <SuperAdminShell>{children}</SuperAdminShell>
      </SuperAdminAuthProvider>
  );
}
