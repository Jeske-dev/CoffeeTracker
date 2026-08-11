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
        <CartesianGrid stroke="#dadada" strokeDasharray="2 4" />
        <XAxis type="number" dataKey="time" domain={timeDomain} tick={{ fontSize: 11, fill: "#5d5f5f" }} unit=" s" axisLine={{ stroke: "#000" }} tickLine={{ stroke: "#000" }} />
        <YAxis type="number" dataKey="ratio" domain={ratioDomain} tick={{ fontSize: 11, fill: "#5d5f5f" }} tickFormatter={(value) => `1:${value.toFixed(1)}`} axisLine={{ stroke: "#000" }} tickLine={{ stroke: "#000" }} />
        {targetArea && <ReferenceArea
          x1={targetArea.timeMin}
          x2={targetArea.timeMax}
          y1={targetArea.ratioMin}
          y2={targetArea.ratioMax}
          fill="#eeeeee"
          fillOpacity={1}
          stroke="#000000"
          strokeDasharray="4 4"
        />}
        <Tooltip cursor={{ stroke: "#000000", strokeDasharray: "3 3" }} content={({ active, payload }) => {
          const point = payload?.[0]?.payload as ShotComparisonPoint | undefined;
          return active && point ? <div className="border border-black bg-white p-3 text-xs leading-5">
            <strong>{point.current ? "Dieser Shot" : point.name}</strong>
            <p>{point.date} · {formatTime(point.time)}<br />{formatRatio(point.ratio)}</p>
          </div> : null;
        }} />
        <Scatter data={peers} dataKey="ratio" name="Ähnliche Shots">
          {peers.map((entry) => <Cell key={entry.id} fill={entry.taste === "unknown" ? "#a3a3a3" : TASTE_COLORS[entry.taste]} stroke="#000" strokeWidth={1} opacity={0.68} />)}
        </Scatter>
        <Scatter data={[current]} dataKey="ratio" name="Dieser Shot" shape={<CurrentDot />} />
      </ComposedChart>
    </ResponsiveContainer>
  </div>;
}

function CurrentDot(props: unknown) {
  const { cx, cy } = props as { cx?: number; cy?: number };
  if (cx === undefined || cy === undefined) return null;
  return <g><rect x={cx - 10} y={cy - 10} width={20} height={20} fill="#000" opacity=".14" /><rect x={cx - 5} y={cy - 5} width={10} height={10} fill="#000" stroke="#fff" strokeWidth={2} /></g>;
}

function EmptyChart({ text }: { text: string }) {
  return <div className="grid h-[238px] place-items-center border bg-[var(--dialed-surface-subtle)] px-6 text-center text-xs leading-5 text-[var(--dialed-text-muted)]">{text}</div>;
}
