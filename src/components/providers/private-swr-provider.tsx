"use client";

import { useMemo, useRef } from "react";
import { SWRConfig } from "swr";

export function PrivateSwrProvider({ children }: { children: React.ReactNode }) {
  const cache = useRef(new Map());
  const config = useMemo(() => ({
    provider: () => cache.current,
    dedupingInterval: 30_000,
    focusThrottleInterval: 5 * 60_000,
    refreshInterval: 0,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    shouldRetryOnError: true,
    errorRetryCount: 2,
    errorRetryInterval: 2_000,
    keepPreviousData: true,
  }), []);

  return <SWRConfig value={config}>{children}</SWRConfig>;
}
