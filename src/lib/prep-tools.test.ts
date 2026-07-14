import { describe, expect, it } from "vitest";
import { normalizePrepTools, togglePrepTool } from "./prep-tools";

describe("Puck-Prep-Werkzeuge", () => {
  it("entfernt unbekannte persistierte Werte an der Domain-Grenze", () => {
    expect(normalizePrepTools(["WDT", "Unbekannt", "Tamper"])).toEqual(["WDT", "Tamper"]);
  });

  it("schaltet ein Werkzeug unveränderlich um", () => {
    const original = ["WDT"] as const;
    expect(togglePrepTool(original, "Tamper")).toEqual(["WDT", "Tamper"]);
    expect(togglePrepTool(original, "WDT")).toEqual([]);
    expect(original).toEqual(["WDT"]);
  });
});
