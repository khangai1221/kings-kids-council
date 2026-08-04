export interface CsvColumn<T> {
  key: keyof T;
  label: string;
}

const FORMULA_LEADING_CHARS = ["=", "+", "-", "@", "\t", "\r"];

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let str = String(value);

  // Prevent CSV/formula injection: a cell opened in Excel/Sheets that starts
  // with one of these characters can execute as a formula. Prefixing with a
  // single quote neutralizes it while keeping the value human-readable.
  if (FORMULA_LEADING_CHARS.some((prefix) => str.startsWith(prefix))) {
    str = `'${str}`;
  }

  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Safe CSV serialization (proper quoting/escaping + formula-injection neutralization). */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCsvCell(c.label)).join(",");
  const lines = rows.map((row) => columns.map((c) => escapeCsvCell(row[c.key])).join(","));
  return [header, ...lines].join("\r\n");
}
