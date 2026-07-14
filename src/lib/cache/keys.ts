export const privateCacheKeys = {
  dashboard: (userId: string) => ["dashboard", userId] as const,
  shots: (userId: string, filters = "recent") => ["shots", userId, filters] as const,
  shot: (userId: string, shotId: string) => ["shot", userId, shotId] as const,
  beans: (userId: string) => ["beans", userId] as const,
  bean: (userId: string, beanId: string) => ["bean", userId, beanId] as const,
  equipment: (userId: string) => ["equipment", userId] as const,
  profile: (userId: string) => ["profile", userId] as const,
  settings: (userId: string) => ["settings", userId] as const,
  activeRecommendation: (userId: string) => ["active-recommendation", userId] as const,
  analytics: (userId: string) => ["analytics", userId] as const,
  consistency: (userId: string) => ["consistency", userId] as const,
};

export const privateCacheTtl = {
  dashboard: 30_000,
  shots: 30_000,
  beans: 5 * 60_000,
  equipment: 15 * 60_000,
  profile: 5 * 60_000,
  settings: 5 * 60_000,
  shot: 10 * 60_000,
  activeRecommendation: 30_000,
} as const;
