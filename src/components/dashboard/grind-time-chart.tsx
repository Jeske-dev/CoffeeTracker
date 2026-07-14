"use client";

import { CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from "recharts";
import { TASTE_COLORS } from "@/lib/calculations";
import { formatTime } from "@/lib/formatting";
import type { ShotSummary } from "@/types/domain";

type GrindTimePoint = {
  id: string;
  bean: string;
  date: string;
  grind: number;
  grindLabel: string;
  time: number;
  taste: ShotSummary["taste"];
};

export function GrindTimeChart({ shots }: { shots: ShotSummary[] }) {
  const data = grindTimePoints(shots);
  if (!data.length) return <div className="grid h-[220px] place-items-center px-6 text-center text-xs leading-5 text-[var(--dialed-text-muted)]">Für die Grafik fehlen noch Shots mit numerischem Mahlgrad und Extraktionszeit.</div>;

  const grinds = data.map((point) => point.grind);
  const times = data.map((point) => point.time);
  const grindPadding = Math.max(0.15, (Math.max(...grinds) - Math.min(...grinds)) * 0.15);
  const xMin = Math.floor((Math.min(...grinds) - grindPadding) * 10) / 10;
  const xMax = Math.ceil((Math.max(...grinds) + grindPadding) * 10) / 10;
  const yMin = Math.max(0, Math.floor(Math.min(...times) - 3));
  const yMax = Math.ceil(Math.max(...times) + 3);

  return <div className="h-[220px] w-full" aria-label="Mahlgrad- und Extraktionszeit-Diagramm">
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 12, right: 8, bottom: 2, left: -12 }}>
        <CartesianGrid stroke="rgba(48,32,25,.08)" strokeDasharray="3 5" />
        <XAxis type="number" dataKey="grind" domain={[xMin, xMax]} tick={{ fontSize: 11, fill: "#8D7E74" }} tickFormatter={(value) => Number(value).toLocaleString("de-DE", { maximumFractionDigits: 2 })} />
        <YAxis type="number" dataKey="time" domain={[yMin, yMax]} tick={{ fontSize: 11, fill: "#8D7E74" }} unit=" s" />
        <Tooltip cursor={{ stroke: "#C8804F", strokeDasharray: "3 3" }} content={({ active, payload }) => {
          const point = payload?.[0]?.payload as GrindTimePoint | undefined;
          return active && point ? <div className="rounded-xl border bg-white p-2 text-xs leading-5 shadow-lg"><strong>{point.bean}</strong><p>{point.date}<br />Mahlgrad {point.grindLabel} · {formatTime(point.time)}</p></div> : null;
        }} />
        {data.length > 1 && <Line type="linear" dataKey="time" stroke="rgba(43,27,22,.32)" strokeWidth={1.5} dot={false} isAnimationActive={false} />}
        <Scatter data={data} name="Shots" isAnimationActive={false}>{data.map((point) => <Cell key={point.id} fill={point.taste ? TASTE_COLORS[point.taste] : "#C8804F"} />)}</Scatter>
      </ComposedChart>
    </ResponsiveContainer>
  </div>;
}

export function grindTimePoints(shots: ShotSummary[]): GrindTimePoint[] {
  const complete = shots.flatMap((shot) => {
    const grind = parseGrind(shot.grind_setting);
    if (grind === null || shot.extraction_seconds === null) return [];
    return [{
      id: shot.id,
      beanId: shot.bean_id,
      grinderId: shot.grinder_id,
      bean: shot.beans?.name ?? "Unbekannte Bohne",
      date: new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short" }).format(new Date(shot.shot_at)),
      grind,
      grindLabel: shot.grind_setting as string,
      time: shot.extraction_seconds,
      taste: shot.taste,
    }];
  });
  const latest = complete[0];
  if (!latest) return [];
  const sameSetup = complete.filter((point) => point.beanId === latest.beanId && point.grinderId === latest.grinderId);
  const sameGrinder = complete.filter((point) => point.grinderId === latest.grinderId);
  const selected = sameSetup.length >= 2 ? sameSetup : sameGrinder.length >= 2 ? sameGrinder : complete;
  return selected.slice(0, 10).reverse().map((point) => ({
    id: point.id,
    bean: point.bean,
    date: point.date,
    grind: point.grind,
    grindLabel: point.grindLabel,
    time: point.time,
    taste: point.taste,
  }));
}

function parseGrind(value: string | null) {
  if (!value) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}
