import { describe, expect, it, vi } from "vitest";
import type { MutatorCallback } from "swr";
import { privateCacheKeys, privateCacheTtl } from "./keys";
import { runOptimisticMutation } from "./optimistic-mutation";

describe("private cache", () => {
  it("isoliert alle Ressourcen über die Nutzer-ID", () => {
    expect(privateCacheKeys.dashboard("user-a")).not.toEqual(privateCacheKeys.dashboard("user-b"));
    expect(privateCacheKeys.shot("user-a", "shot-1")).toEqual(["shot", "user-a", "shot-1"]);
    expect(privateCacheKeys.shots("user-a", "sweet-spot")).toEqual(["shots", "user-a", "sweet-spot"]);
  });

  it("verwendet die vorgesehenen Cache-Zeiten", () => {
    expect(privateCacheTtl.dashboard).toBe(30_000);
    expect(privateCacheTtl.beans).toBe(5 * 60_000);
    expect(privateCacheTtl.equipment).toBe(15 * 60_000);
    expect(privateCacheTtl.shot).toBe(10 * 60_000);
  });

  it("rollt eine fehlgeschlagene optimistische Mutation zurück", async () => {
    type Data = { ids: string[] };
    let cache: Data | undefined = { ids: ["existing"] };
    const mutate = vi.fn(async (data?: Data | MutatorCallback<Data>) => {
      cache = typeof data === "function" ? await data(cache) : data;
      return cache;
    });

    await expect(runOptimisticMutation<Data, never>({
      mutate,
      optimisticData: (current) => ({ ids: ["new", ...(current?.ids ?? [])] }),
      mutation: async () => { throw new Error("database unavailable"); },
    })).rejects.toThrow("database unavailable");

    expect(cache).toEqual({ ids: ["existing"] });
    expect(mutate).toHaveBeenCalledTimes(2);
  });
});
