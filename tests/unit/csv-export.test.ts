import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv/export";

describe("toCsv", () => {
  it("renders a header row and one line per record", () => {
    const csv = toCsv([{ name: "Anujin", email: "anujin@kingskids.mn" }], [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
    ]);
    expect(csv).toBe("Name,Email\r\nAnujin,anujin@kingskids.mn");
  });

  it("quotes and escapes values containing commas, quotes, or newlines", () => {
    const csv = toCsv([{ note: 'Say "hi", then\nbye' }], [{ key: "note", label: "Note" }]);
    expect(csv).toBe('Note\r\n"Say ""hi"", then\nbye"');
  });

  it("renders null/undefined as an empty cell", () => {
    const csv = toCsv([{ value: null }, { value: undefined }], [{ key: "value", label: "Value" }]);
    expect(csv).toBe("Value\r\n\r\n");
  });

  it("neutralizes CSV formula injection by prefixing risky leading characters", () => {
    expect(toCsv([{ value: "=1+1" }], [{ key: "value", label: "Value" }])).toBe("Value\r\n'=1+1");
    expect(toCsv([{ value: "+cmd" }], [{ key: "value", label: "Value" }])).toBe("Value\r\n'+cmd");
    expect(toCsv([{ value: "@SUM(1,2)" }], [{ key: "value", label: "Value" }])).toBe('Value\r\n"\'@SUM(1,2)"');
  });

  it("leaves ordinary values starting with a hyphenated word untouched-looking after quoting rules", () => {
    // A leading "-" is still neutralized (spreadsheets treat -1+1 as a formula too).
    expect(toCsv([{ value: "-1" }], [{ key: "value", label: "Value" }])).toBe("Value\r\n'-1");
  });
});
