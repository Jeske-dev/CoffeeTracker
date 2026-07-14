"use client";

import { CartesianGrid, Cell, ComposedChart, Line, ReferenceArea, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from "recharts";
import {
  OPTIMAL_RATIO_RANGE,
  OPTIMAL_TIME_RANGE,
  type TimeRatioPoint,
  type TimeRatioSeries,
} from "@/features/shots/time-ratio-series";
import { TASTE_COLORS } from "@/lib/calculations";
import { formatRatio, formatTime } from "@/lib/formatting";

export function SweetSpotChart({ series }: { series: TimeRatioSeries }) {
  const { points, timeDomain, ratioDomain } = series;
  if (!points.length) return <div className="grid h-[220px] place-items-center px-6 text-center text-xs leading-5 text-[var(--dialed-text-muted)]">Für die Grafik fehlen Shots mit Zeit, Dosis und finalem Gewicht.</div>;

  return <div className="h-[220px] w-full" aria-label="Zeit- und Ratio-Diagramm">
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={points} margin={{ top: 12, right: 8, bottom: 2, left: -18 }}>
        <CartesianGrid stroke="rgba(48,32,25,.08)" strokeDasharray="3 5" />
        <XAxis type="number" dataKey="time" domain={timeDomain} tick={{ fontSize: 11, fill: "#8D7E74" }} unit=" s" />
        <YAxis type="number" dataKey="ratio" domain={ratioDomain} tick={{ fontSize: 11, fill: "#8D7E74" }} tickFormatter={(value) => `1:${Number(value).toFixed(1)}`} />
        <ReferenceArea
          x1={OPTIMAL_TIME_RANGE[0]}
          x2={OPTIMAL_TIME_RANGE[1]}
          y1={OPTIMAL_RATIO_RANGE[0]}
          y2={OPTIMAL_RATIO_RANGE[1]}
          fill="#DFE7DC"
          fillOpacity={0.82}
          stroke="#6F806F"
          strokeDasharray="4 4"
        />
        <Tooltip cursor={{ stroke: "#C8804F", strokeDasharray: "3 3" }} content={({ active, payload }) => {
          const point = payload?.[0]?.payload as TimeRatioPoint | undefined;
          return active && point ? <div className="rounded-xl border bg-white p-2 text-xs leading-5 shadow-lg">
            <strong>{point.bean}</strong>
            <p>{point.date} · {formatTime(point.time)}<br />{formatRatio(point.ratio)}</p>
          </div> : null;
        }} />
        {points.length > 1 && <Line type="linear" dataKey="ratio" stroke="rgba(43,27,22,.28)" strokeWidth={1.5} strokeDasharray="3 4" dot={false} isAnimationActive={false} />}
        <Scatter data={points} dataKey="ratio" name="Shots" isAnimationActive={false}>
          {points.map((point) => <Cell key={point.id} fill={point.taste ? TASTE_COLORS[point.taste] : "#B8ADA6"} />)}
        </Scatter>
      </ComposedChart>
    </ResponsiveContainer>
  </div>;
}
