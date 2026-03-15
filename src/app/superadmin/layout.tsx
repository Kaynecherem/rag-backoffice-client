"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SuperAdminAuthProvider, useSuperAdminAuth } from "@/lib/superadmin-auth-context";
import Image from "next/image";

function SuperAdminShell({ children }: { children: React.ReactNode }) {
  const { user, hydrated, logout } = useSuperAdminAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (hydrated && !user && pathname !== "/superadmin/login") {
      router.replace("/superadmin/login");
    }
  }, [hydrated, user, pathname, router]);

  if (!hydrated) {
    return (
        <div className="h-screen flex items-center justify-center bg-gray-950">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
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
      <div className="h-screen flex overflow-hidden bg-gray-950 text-gray-100">
        <aside className="w-60 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
          <div className="p-5 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
                <Image
                    src="/patch-logo-orange.jpg"
                    alt="Patch"
                    width={36}
                    height={36}
                    className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.15em] text-amber-400/80">
                  Powered by Patch
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">Superadmin</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
                <button
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                        isActive(item.href)
                            ? "bg-amber-400/10 text-amber-400 font-medium"
                            : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/60"
                    }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </button>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-800">
            <div className="text-xs text-gray-500 truncate mb-2">{user.email}</div>
            <button
                onClick={() => { logout(); router.replace("/superadmin/login"); }}
                className="w-full text-left text-xs text-gray-500 hover:text-red-400 transition-colors"
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