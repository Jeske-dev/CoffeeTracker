import "server-only";

type TimingKind = "auth" | "dashboard" | "shots" | "beans" | "equipment" | "recommendation" | "analytics" | "shot-detail";

export async function measureServerOperation<T>(kind: TimingKind, queryCount: number, operation: () => Promise<T>): Promise<T> {
  const startedAt = performance.now();
  try {
    return await operation();
  } finally {
    console.info("dialed.performance", {
      kind,
      queryCount,
      durationMs: Math.round((performance.now() - startedAt) * 10) / 10,
    });
  }
}
