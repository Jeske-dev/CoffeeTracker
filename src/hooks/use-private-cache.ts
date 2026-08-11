"use client";

import { useCallback } from "react";
import { useSWRConfig } from "swr";
import { privateCacheKeys } from "@/lib/cache/keys";

export function usePrivateCache() {
  const { cache, mutate } = useSWRConfig();

  const discard = useCallback(async (keys: readonly unknown[][]) => {
    await Promise.all(keys.map((key) => mutate(key, undefined, { revalidate: false })));
  }, [mutate]);

  const invalidateShotData = useCallback(async ({ userId, beanId, previousBeanId, shotId, preserveShotList = false }: { userId: string; beanId: string; previousBeanId?: string; shotId?: string; preserveShotList?: boolean }) => {
    const keys: unknown[][] = [
      [...privateCacheKeys.dashboard(userId)],
      [...privateCacheKeys.beans(userId)],
      [...privateCacheKeys.bean(userId, beanId)],
      [...privateCacheKeys.activeRecommendation(userId)],
      [...privateCacheKeys.analytics(userId)],
      [...privateCacheKeys.consistency(userId)],
      [...privateCacheKeys.settings(userId)],
    ];
    if (previousBeanId && previousBeanId !== beanId) keys.push([...privateCacheKeys.bean(userId, previousBeanId)]);
    if (!preserveShotList) keys.push([...privateCacheKeys.shots(userId)]);
    if (shotId) keys.push([...privateCacheKeys.shot(userId, shotId)]);
    await discard(keys);
  }, [discard]);

  const invalidateBeanData = useCallback(async ({ userId, beanId, touchesDashboard = true }: { userId: string; beanId?: string; touchesDashboard?: boolean }) => {
    const keys: unknown[][] = [[...privateCacheKeys.beans(userId)]];
    if (beanId) keys.push([...privateCacheKeys.bean(userId, beanId)]);
    if (touchesDashboard) keys.push([...privateCacheKeys.dashboard(userId)]);
    await discard(keys);
  }, [discard]);

  const invalidateSetupData = useCallback(async (userId: string) => {
    await discard([
      [...privateCacheKeys.equipment(userId)],
      [...privateCacheKeys.profile(userId)],
      [...privateCacheKeys.settings(userId)],
      [...privateCacheKeys.dashboard(userId)],
    ]);
  }, [discard]);

  const invalidateRecommendationData = useCallback(async (userId: string) => {
    await discard([
      [...privateCacheKeys.activeRecommendation(userId)],
      [...privateCacheKeys.dashboard(userId)],
    ]);
  }, [discard]);

  const clearPrivateCache = useCallback(async () => {
    await mutate(() => true, undefined, { revalidate: false });
    for (const key of Array.from(cache.keys())) cache.delete(key);
  }, [cache, mutate]);

  return {
    cache,
    mutate,
    invalidateShotData,
    invalidateBeanData,
    invalidateSetupData,
    invalidateRecommendationData,
    clearPrivateCache,
  };
}
