"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";

export function OfflineNotice() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return <div role="status" className="fixed inset-x-3 bottom-[calc(78px+env(safe-area-inset-bottom))] z-[70] mx-auto flex min-h-11 max-w-[520px] items-center gap-2 rounded-lg border border-[var(--dialed-gold)]/25 bg-[var(--dialed-surface)] px-3 py-2 text-[11px] shadow-[var(--shadow-md)]"><WifiOff className="size-4 shrink-0 text-[var(--dialed-gold)]" /><span>Du bist offline. Neue Shots können momentan nicht synchronisiert werden.</span></div>;
}
