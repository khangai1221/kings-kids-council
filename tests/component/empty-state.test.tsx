import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "@/components/shared/empty-state";

describe("EmptyState", () => {
  it("renders the title and optional description", () => {
    render(<EmptyState title="No active elections right now." description="New elections will appear here when they open." />);
    expect(screen.getByText("No active elections right now.")).toBeInTheDocument();
    expect(screen.getByText("New elections will appear here when they open.")).toBeInTheDocument();
  });

  it("renders without a description", () => {
    render(<EmptyState title="Nothing here yet" />);
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
  });
});
