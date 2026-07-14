"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePrivateCache } from "@/hooks/use-private-cache";

export function usePrivateLogout() {
  const router = useRouter();
  const { clearPrivateCache } = usePrivateCache();

  return useCallback(async () => {
    await clearPrivateCache();
    const response = await fetch("/auth/signout", { method: "POST", cache: "no-store" });
    if (!response.ok) throw new Error("Logout failed");
    router.replace("/auth/login");
    router.refresh();
  }, [clearPrivateCache, router]);
}
