import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrivateSwrProvider } from "@/components/providers/private-swr-provider";
import { usePrivateLogout } from "./use-private-logout";

const mocks = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }) }));

function LogoutButton() {
  const logout = usePrivateLogout();
  return <button onClick={() => void logout()}>logout</button>;
}

describe("usePrivateLogout", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("meldet serverseitig ab und öffnet danach die Login-Route", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    render(<PrivateSwrProvider><LogoutButton/></PrivateSwrProvider>);
    fireEvent.click(screen.getByRole("button", { name: "logout" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/auth/signout", { method: "POST", cache: "no-store" }));
    expect(mocks.replace).toHaveBeenCalledWith("/auth/login");
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });
});
