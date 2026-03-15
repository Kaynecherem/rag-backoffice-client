"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSuperAdminAuth } from "@/lib/superadmin-auth-context";
import { superadminLogin, superadminSetup } from "@/lib/superadmin-api";
import Image from "next/image";

export default function SuperAdminLoginPage() {
  const { login } = useSuperAdminAuth();
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "setup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let result;
      if (mode === "setup") {
        result = await superadminSetup(email.trim(), name.trim(), password);
      } else {
        result = await superadminLogin(email.trim(), password);
      }
      login(result.token, result.email, result.name);
      router.replace("/superadmin");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          {/* Header — Patch Branding */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl overflow-hidden">
              <Image
                  src="/patch-logo-orange.jpg"
                  alt="Patch"
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
              />
            </div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-amber-400/70 mt-2">
              Powered by Patch
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Platform Administration
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex mb-6 bg-gray-900 rounded-lg p-1">
            <button
                type="button"
                onClick={() => setMode("login")}
                className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
                    mode === "login"
                        ? "bg-gray-800 text-white shadow-sm"
                        : "text-gray-500 hover:text-gray-300"
                }`}
            >
              Sign In
            </button>
            <button
                type="button"
                onClick={() => setMode("setup")}
                className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
                    mode === "setup"
                        ? "bg-gray-800 text-white shadow-sm"
                        : "text-gray-500 hover:text-gray-300"
                }`}
            >
              Initial Setup
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "setup" && (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Name
                  </label>
                  <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20 transition-colors"
                      placeholder="Your name"
                  />
                </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Email
              </label>
              <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20 transition-colors"
                  placeholder="admin@company.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-3 py-2.5 pr-10 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20 transition-colors"
                    placeholder="••••••••"
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    tabIndex={-1}
                >
                  {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                  ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
                <div className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                  {error}
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-amber-400 text-gray-950 text-sm font-semibold rounded-lg hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                  ? "..."
                  : mode === "setup"
                      ? "Create Superadmin Account"
                      : "Sign In"}
            </button>
          </form>

          {mode === "setup" && (
              <p className="mt-4 text-[11px] text-gray-600 text-center leading-relaxed">
                Initial setup creates the first superadmin account.
                This only works once — when no superadmins exist yet.
              </p>
          )}
        </div>
      </div>
  );
}