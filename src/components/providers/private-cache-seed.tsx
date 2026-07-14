"use client";

import { useEffect } from "react";
import { unstable_serialize, useSWRConfig, type Key } from "swr";

export function PrivateCacheSeed({ entries }: { entries: { key: Key; data: unknown }[] }) {
  const { cache } = useSWRConfig();

  useEffect(() => {
    for (const entry of entries) {
      const key = unstable_serialize(entry.key);
      if (cache.get(key) === undefined) cache.set(key, { data: entry.data });
    }
  }, [cache, entries]);
  return null;
}
