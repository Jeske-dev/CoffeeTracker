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
        <CartesianGrid stroke="#dadada" strokeDasharray="2 4" />
        <XAxis type="number" dataKey="time" domain={timeDomain} tick={{ fontSize: 11, fill: "#5d5f5f" }} unit=" s" axisLine={{ stroke: "#000" }} tickLine={{ stroke: "#000" }} />
        <YAxis type="number" dataKey="ratio" domain={ratioDomain} tick={{ fontSize: 11, fill: "#5d5f5f" }} tickFormatter={(value) => `1:${Number(value).toFixed(1)}`} axisLine={{ stroke: "#000" }} tickLine={{ stroke: "#000" }} />
        <ReferenceArea
          x1={OPTIMAL_TIME_RANGE[0]}
          x2={OPTIMAL_TIME_RANGE[1]}
          y1={OPTIMAL_RATIO_RANGE[0]}
          y2={OPTIMAL_RATIO_RANGE[1]}
          fill="#eeeeee"
          fillOpacity={1}
          stroke="#000000"
          strokeDasharray="4 4"
        />
        <Tooltip cursor={{ stroke: "#000000", strokeDasharray: "3 3" }} content={({ active, payload }) => {
          const point = payload?.[0]?.payload as TimeRatioPoint | undefined;
          return active && point ? <div className="border border-black bg-white p-3 text-xs leading-5">
            <strong>{point.bean}</strong>
            <p>{point.date} · {formatTime(point.time)}<br />{formatRatio(point.ratio)}</p>
          </div> : null;
        }} />
        {points.length > 1 && <Line type="linear" dataKey="ratio" stroke="#757575" strokeWidth={1.5} strokeDasharray="3 4" dot={false} isAnimationActive={false} />}
        <Scatter data={points} dataKey="ratio" name="Shots" isAnimationActive={false}>
          {points.map((point, index) => {
            const opacity = points.length === 1 ? 1 : 0.25 + (index / (points.length - 1)) * 0.75;
            return <Cell key={point.id} fill={point.taste ? TASTE_COLORS[point.taste] : "#a3a3a3"} fillOpacity={opacity} stroke="#000" strokeOpacity={opacity} strokeWidth={1} />;
          })}
        </Scatter>
      </ComposedChart>
    </ResponsiveContainer>
  </div>;
}
