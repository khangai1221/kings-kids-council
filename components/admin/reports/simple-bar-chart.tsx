"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface ChartDatum {
  label: string;
  value: number;
}

/**
 * Renders alongside a plain-text summary list so the same information is
 * never communicated by color/shape alone (WCAG — see the <ul> below).
 */
export function SimpleBarChart({ data, valueLabel = "Count" }: { data: ChartDatum[]; valueLabel?: string }) {
  return (
    <div>
      <div className="h-64 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" fill="var(--color-primary)" radius={[4, 4, 0, 0]} name={valueLabel} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="sr-only">
        {data.map((d) => (
          <li key={d.label}>{d.label}: {d.value} {valueLabel.toLowerCase()}</li>
        ))}
      </ul>
    </div>
  );
}
