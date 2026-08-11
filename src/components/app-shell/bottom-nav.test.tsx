import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BottomNav } from "./bottom-nav";

const mocks = vi.hoisted(() => ({ prefetch: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/app",
  useRouter: () => ({ prefetch: mocks.prefetch }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, prefetch, ...props }: React.ComponentProps<"a"> & { prefetch?: boolean }) => <a href={String(href)} data-prefetch={String(prefetch)} {...props}>{children}</a>,
}));

describe("BottomNav", () => {
  it("nutzt interne Links und prefetcht alle Hauptseiten", async () => {
    render(<BottomNav/>);
    const expected = [["Heute", "/app"], ["Shots", "/app/shots"], ["Bohnen", "/app/beans"], ["Setup", "/app/setup"]] as const;
    for (const [label, href] of expected) expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", href);
    expect(screen.getAllByRole("link").every((link) => link.dataset.prefetch === "true")).toBe(true);
    await waitFor(() => expect(mocks.prefetch).toHaveBeenCalledTimes(expected.length));
    for (const [, href] of expected) expect(mocks.prefetch).toHaveBeenCalledWith(href);
  });
});
