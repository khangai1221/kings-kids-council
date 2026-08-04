import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/shared/status-badge";

describe("StatusBadge", () => {
  it("renders the humanized label for a known status", () => {
    render(<StatusBadge status="under_review" />);
    expect(screen.getByText("Under review")).toBeInTheDocument();
  });

  it("renders a humanized fallback for an unknown status", () => {
    render(<StatusBadge status="totally_made_up" />);
    expect(screen.getByText("totally made up")).toBeInTheDocument();
  });
});
