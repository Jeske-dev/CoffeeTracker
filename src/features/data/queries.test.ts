import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { loadDashboardData } from "./queries";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function queryBuilder<T>(promise: Promise<T>) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "in", "order", "limit", "maybeSingle"]) builder[method] = () => builder;
  builder.then = promise.then.bind(promise);
  return builder;
}

describe("route-specific data queries", () => {
  it("startet alle unabhängigen Dashboard-Abfragen parallel", async () => {
    const pending = Array.from({ length: 5 }, () => deferred<{ data: unknown; error: null }>());
    let index = 0;
    const from = vi.fn(() => queryBuilder(pending[index++].promise));
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    const resultPromise = loadDashboardData("user-a", { from } as never);
    await Promise.resolve();
    await Promise.resolve();
    expect(from).toHaveBeenCalledTimes(5);

    pending[0].resolve({ data: { id: "user-a", display_name: "A", created_at: "2026-01-01" }, error: null });
    pending[1].resolve({ data: null, error: null });
    pending[2].resolve({ data: [], error: null });
    pending[3].resolve({ data: [], error: null });
    pending[4].resolve({ data: null, error: null });

    const result = await resultPromise;
    expect(result.shots).toEqual([]);
    expect(info).toHaveBeenCalledWith("dialed.performance", expect.objectContaining({ kind: "dashboard", queryCount: 5 }));
    info.mockRestore();
  });
});
