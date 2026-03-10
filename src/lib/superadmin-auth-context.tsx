"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface SuperAdminUser {
  token: string;
  email: string;
  name: string;
}

interface SuperAdminAuthContextType {
  user: SuperAdminUser | null;
  hydrated: boolean;
  login: (token: string, email: string, name: string) => void;
  logout: () => void;
}

const SuperAdminAuthContext = createContext<SuperAdminAuthContextType>({
  user: null,
  hydrated: false,
  login: () => {},
  logout: () => {},
});

const STORAGE_KEY = "superadmin_auth";

export function SuperAdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SuperAdminUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Basic token expiry check — JWT exp is in seconds
        const payload = JSON.parse(atob(parsed.token.split(".")[1]));
        if (payload.exp * 1000 > Date.now()) {
          setUser(parsed);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setHydrated(true);
  }, []);

  const login = useCallback((token: string, email: string, name: string) => {
    const userData = { token, email, name };
    setUser(userData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <SuperAdminAuthContext.Provider value={{ user, hydrated, login, logout }}>
      {children}
    </SuperAdminAuthContext.Provider>
  );
}

export function useSuperAdminAuth() {
  return useContext(SuperAdminAuthContext);
}
