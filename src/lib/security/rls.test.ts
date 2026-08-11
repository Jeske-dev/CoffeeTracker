import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Supabase RLS", () => {
  it("isoliert die privaten Kerntabellen weiterhin über auth.uid()", () => {
    const schema = readFileSync("supabase/migrations/20260713000000_dialed_schema.sql", "utf8");
    for (const table of ["profiles", "beans", "equipment", "user_settings", "shots"]) {
      expect(schema).toContain(`alter table public.${table} enable row level security`);
    }
    expect(schema).toContain("using ((select auth.uid()) = user_id)");
    expect(schema).toContain("with check ((select auth.uid()) = user_id)");
    expect(schema).not.toContain("using (auth.uid() = user_id)");
  });
});
