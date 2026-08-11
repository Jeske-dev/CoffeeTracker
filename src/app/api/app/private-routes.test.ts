import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  loadShotsPageData: vi.fn(),
  loadBeansPageData: vi.fn(),
}));

vi.mock("@/lib/supabase/auth", () => ({ getAuthContext: mocks.getAuthContext }));
vi.mock("@/features/data/queries", () => ({
  loadShotsPageData: mocks.loadShotsPageData,
  loadBeansPageData: mocks.loadBeansPageData,
}));

import { GET as getShots } from "./shots/route";
import { GET as getBeans } from "./beans/route";

describe("private API cache headers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthContext.mockResolvedValue({ userId: "user-a", supabase: {} });
    mocks.loadShotsPageData.mockResolvedValue({ shots: [], beans: [], error: null });
    mocks.loadBeansPageData.mockResolvedValue({ beans: [], lastBeanId: null, shotCounts: {}, error: null });
  });

  it.each([getShots, getBeans])("liefert private Daten ausschließlich mit no-store", async (handler) => {
    const response = await handler();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("private, no-store");
    expect(response.headers.get("vary")).toBe("Cookie");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("cached auch eine Auth-Fehlerantwort nicht öffentlich", async () => {
    mocks.getAuthContext.mockResolvedValue(null);
    const response = await getShots();
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
});
