"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";

export function OfflineNotice() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return <div role="status" className="fixed inset-x-6 bottom-[calc(80px+env(safe-area-inset-bottom))] z-[70] mx-auto flex min-h-11 max-w-[520px] items-center gap-2 border border-black bg-white px-3 py-2 text-[11px]"><WifiOff className="size-4 shrink-0 text-black" /><span>Du bist offline. Neue Shots können momentan nicht synchronisiert werden.</span></div>;
}
