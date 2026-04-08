"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/superadmin");
  }, [router]);

  return (
    <div className="h-screen flex items-center justify-center bg-page">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
    </div>
  );
}
