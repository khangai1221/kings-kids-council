import { describe, expect, it } from "vitest";
import { generateIcsEvent } from "@/lib/ics/generate";

describe("generateIcsEvent", () => {
  it("produces a well-formed VCALENDAR/VEVENT block", () => {
    const ics = generateIcsEvent({
      uid: "event-123",
      title: "Debate Competition",
      description: "Fall debate competition",
      location: "Main Auditorium",
      startsAt: "2026-09-18T09:00:00.000Z",
      endsAt: "2026-09-18T13:00:00.000Z",
    });

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("UID:event-123@student-council-portal");
    expect(ics).toContain("SUMMARY:Debate Competition");
    expect(ics).toContain("LOCATION:Main Auditorium");
    expect(ics).toContain("DTSTART:20260918T090000Z");
    expect(ics).toContain("DTEND:20260918T130000Z");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("escapes commas, semicolons and newlines in text fields", () => {
    const ics = generateIcsEvent({
      uid: "event-456",
      title: "Meeting; Planning, Session\nPart 2",
      startsAt: "2026-01-01T00:00:00.000Z",
      endsAt: "2026-01-01T01:00:00.000Z",
    });
    expect(ics).toContain("SUMMARY:Meeting\\; Planning\\, Session\\nPart 2");
  });

  it("omits DESCRIPTION/LOCATION lines when not provided", () => {
    const ics = generateIcsEvent({
      uid: "event-789",
      title: "No Location Event",
      startsAt: "2026-01-01T00:00:00.000Z",
      endsAt: "2026-01-01T01:00:00.000Z",
    });
    expect(ics).not.toContain("DESCRIPTION:");
    expect(ics).not.toContain("LOCATION:");
  });
});
