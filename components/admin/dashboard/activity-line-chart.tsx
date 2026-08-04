"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface ActivitySeriesPoint {
  date: string;
  [seriesKey: string]: string | number;
}

export interface ActivitySeriesConfig {
  key: string;
  label: string;
  color: string;
}

/**
 * Renders alongside a plain-text summary list so the same information is
 * never communicated by color/shape alone (WCAG — mirrors SimpleBarChart's
 * accessible pattern).
 */
export function ActivityLineChart({ data, series }: { data: ActivitySeriesPoint[]; series: ActivitySeriesConfig[] }) {
  return (
    <div>
      <div className="h-64 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            {series.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ul className="sr-only">
        {data.map((point) => (
          <li key={point.date}>
            {point.date}: {series.map((s) => `${s.label} ${point[s.key] ?? 0}`).join(", ")}
          </li>
        ))}
      </ul>
    </div>
  );
}
