import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import useSWR, { unstable_serialize, useSWRConfig } from "swr";
import { PrivateSwrProvider } from "./private-swr-provider";
import { PrivateCacheSeed } from "./private-cache-seed";
import { privateCacheKeys } from "@/lib/cache/keys";
import { usePrivateCache } from "@/hooks/use-private-cache";

function Probe({ userId, fetcher }: { userId: string; fetcher: (key: readonly [string, string]) => Promise<string> }) {
  const { data } = useSWR(privateCacheKeys.dashboard(userId), fetcher);
  return <span>{data ?? "loading"}</span>;
}

function SeedProbe({ userId }: { userId: string }) {
  const { data } = useSWR<string>(privateCacheKeys.dashboard(userId), null, { revalidateOnMount: false });
  return <span>{data ?? "empty"}</span>;
}

function SeedHarness({ entries }: { entries: { key: ReturnType<typeof privateCacheKeys.dashboard>; data: string }[] }) {
  const [showProbe, setShowProbe] = useState(false);
  return <><PrivateCacheSeed entries={entries}/><button onClick={() => setShowProbe(true)}>navigate</button>{showProbe && <SeedProbe userId="user-a"/>}</>;
}

function CacheControls() {
  const { cache, mutate } = useSWRConfig();
  const { clearPrivateCache } = usePrivateCache();
  const [state, setState] = useState("empty");
  const userA = privateCacheKeys.dashboard("user-a");
  const userB = privateCacheKeys.dashboard("user-b");
  const read = () => {
    const a = cache.get(unstable_serialize(userA))?.data;
    const b = cache.get(unstable_serialize(userB))?.data;
    setState(`${a ?? "none"}/${b ?? "none"}`);
  };
  return <><span>{state}</span><button onClick={async () => { await mutate(userA, "A", { revalidate: false }); read(); }}>seed A</button><button onClick={async () => { await clearPrivateCache(); await mutate(userB, "B", { revalidate: false }); read(); }}>logout and switch</button></>;
}

describe("PrivateSwrProvider", () => {
  afterEach(cleanup);
  it("dedupliziert identische SWR-Anfragen", async () => {
    const fetcher = vi.fn(async () => "dashboard");
    render(<PrivateSwrProvider><Probe userId="user-a" fetcher={fetcher}/><Probe userId="user-a" fetcher={fetcher}/></PrivateSwrProvider>);
    expect((await screen.findAllByText("dashboard"))).toHaveLength(2);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("verwendet Serverdaten als Fallback ohne Hydrations-Refetch", async () => {
    const entries = [{ key: privateCacheKeys.dashboard("user-a"), data: "server dashboard" }];
    render(<PrivateSwrProvider><SeedHarness entries={entries}/></PrivateSwrProvider>);
    await waitFor(() => fireEvent.click(screen.getByRole("button", { name: "navigate" })));
    expect(await screen.findByText("server dashboard")).toBeInTheDocument();
  });

  it("leert beim Logout alte Daten vor einem Nutzerwechsel", async () => {
    render(<PrivateSwrProvider><CacheControls/></PrivateSwrProvider>);
    fireEvent.click(screen.getByRole("button", { name: "seed A" }));
    await screen.findByText("A/none");
    fireEvent.click(screen.getByRole("button", { name: "logout and switch" }));
    await waitFor(() => expect(screen.getByText("none/B")).toBeInTheDocument());
  });
});
