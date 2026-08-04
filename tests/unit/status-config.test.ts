import { describe, expect, it } from "vitest";
import { getStatusConfig } from "@/lib/status-config";

describe("getStatusConfig", () => {
  it("returns a known status with its configured label and tone", () => {
    expect(getStatusConfig("accepted")).toEqual({ label: "Accepted", tone: "success" });
    expect(getStatusConfig("suspended")).toEqual({ label: "Suspended", tone: "error" });
  });

  it("falls back to a humanized neutral badge for an unknown status", () => {
    expect(getStatusConfig("some_unexpected_status")).toEqual({ label: "some unexpected status", tone: "neutral" });
  });
});
