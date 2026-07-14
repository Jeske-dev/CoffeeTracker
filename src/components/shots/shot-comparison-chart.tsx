"use client";

import { CartesianGrid, Cell, ComposedChart, ReferenceArea, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from "recharts";
import type { ShotComparisonPoint, ShotComparisonSeries } from "@/features/shots/comparison-series";
import { TASTE_COLORS } from "@/lib/calculations";
import { formatRatio, formatTime } from "@/lib/formatting";

export function ShotComparisonChart({ series }: { series: ShotComparisonSeries }) {
  const { current, peers, timeDomain, ratioDomain, targetArea, emptyReason } = series;
  if (!current) return <EmptyChart text={emptyReason ?? "Für den Vergleich fehlen Daten."} />;

  return <div className="h-[238px] w-full" aria-label="Shot-Vergleichsdiagramm">
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart margin={{ top: 12, right: 8, bottom: 2, left: -18 }}>
        <CartesianGrid stroke="rgba(48,32,25,.08)" strokeDasharray="3 5" />
        <XAxis type="number" dataKey="time" domain={timeDomain} tick={{ fontSize: 11, fill: "#8D7E74" }} unit=" s" />
        <YAxis type="number" dataKey="ratio" domain={ratioDomain} tick={{ fontSize: 11, fill: "#8D7E74" }} tickFormatter={(value) => `1:${value.toFixed(1)}`} />
        {targetArea && <ReferenceArea
          x1={targetArea.timeMin}
          x2={targetArea.timeMax}
          y1={targetArea.ratioMin}
          y2={targetArea.ratioMax}
          fill="#DFE7DC"
          fillOpacity={0.82}
          stroke="#6F806F"
          strokeDasharray="4 4"
        />}
        <Tooltip cursor={{ stroke: "#C8804F", strokeDasharray: "3 3" }} content={({ active, payload }) => {
          const point = payload?.[0]?.payload as ShotComparisonPoint | undefined;
          return active && point ? <div className="rounded-xl border bg-white p-2 text-xs leading-5 shadow-lg">
            <strong>{point.current ? "Dieser Shot" : point.name}</strong>
            <p>{point.date} · {formatTime(point.time)}<br />{formatRatio(point.ratio)}</p>
          </div> : null;
        }} />
        <Scatter data={peers} dataKey="ratio" name="Ähnliche Shots">
          {peers.map((entry) => <Cell key={entry.id} fill={entry.taste === "unknown" ? "#b8ada6" : TASTE_COLORS[entry.taste]} opacity={0.62} />)}
        </Scatter>
        <Scatter data={[current]} dataKey="ratio" name="Dieser Shot" shape={<CurrentDot />} />
      </ComposedChart>
    </ResponsiveContainer>
  </div>;
}

function CurrentDot(props: unknown) {
  const { cx, cy } = props as { cx?: number; cy?: number };
  if (cx === undefined || cy === undefined) return null;
  return <g><circle cx={cx} cy={cy} r={10} fill="#2b1b16" opacity=".16" /><circle cx={cx} cy={cy} r={6} fill="#2b1b16" stroke="#fff" strokeWidth={2} /></g>;
}

function EmptyChart({ text }: { text: string }) {
  return <div className="grid h-[238px] place-items-center rounded-[18px] bg-[var(--dialed-surface-subtle)] px-6 text-center text-xs leading-5 text-[var(--dialed-text-muted)]">{text}</div>;
}
