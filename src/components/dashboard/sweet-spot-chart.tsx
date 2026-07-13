"use client";
import { CartesianGrid, Cell, ComposedChart, Line, ReferenceArea, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from "recharts";
import { brewRatio, TASTE_COLORS } from "@/lib/calculations";
import { formatRatio, formatTime, formatWeight } from "@/lib/formatting";
import type { ShotWithBean } from "@/types/domain";

export function SweetSpotChart({ shots }: { shots: ShotWithBean[] }) {
  const complete = shots.filter((s) => s.extraction_seconds !== null && s.final_yield_grams !== null && s.dose_grams !== null && s.taste !== null);
  const data = [...complete].reverse().map((s) => ({ time: s.extraction_seconds as number, yield: s.final_yield_grams as number, name: s.beans?.name ?? "Shot", ratio: brewRatio(s.final_yield_grams, s.dose_grams), taste: s.taste as keyof typeof TASTE_COLORS, date: new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short" }).format(new Date(s.shot_at)) }));
  const dose = complete.length ? complete.reduce((sum, s) => sum + (s.dose_grams as number), 0) / complete.length : 19;
  const ys = data.map((d) => d.yield); const yMin = Math.min(30, ...ys) - 1; const yMax = Math.max(45, ...ys) + 1;
  if (!data.length) return <div className="grid h-44 place-items-center text-center text-xs text-[var(--dialed-text-muted)]">Noch nicht genug vollständige Shots für den Sweet-Spot.</div>;
  return <div className="h-44 w-full" aria-label="Sweet-Spot-Diagramm"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: -18 }}><CartesianGrid stroke="rgba(48,32,25,.08)" strokeDasharray="3 5" /><XAxis type="number" dataKey="time" domain={[20, 40]} tick={{ fontSize: 8, fill: "#8D7E74" }} unit=" s" /><YAxis type="number" dataKey="yield" domain={[yMin, yMax]} tick={{ fontSize: 8, fill: "#8D7E74" }} unit=" g" /><ReferenceArea x1={25} x2={32} y1={dose * 1.8} y2={dose * 2.15} fill="#DFE7DC" fillOpacity={.7} stroke="#6F806F" strokeDasharray="4 4" /><Tooltip cursor={{ stroke: "#C8804F", strokeDasharray: "3 3" }} content={({ active, payload }) => { const p = payload?.[0]?.payload as (typeof data)[number] | undefined; return active && p ? <div className="rounded-xl border bg-white p-2 text-[10px] shadow-lg"><strong>{p.name}</strong><p>{p.date} · {formatTime(p.time)} · {formatWeight(p.yield)}<br />{formatRatio(p.ratio)}</p></div> : null; }} /><Line type="monotone" dataKey="yield" stroke="rgba(43,27,22,.28)" strokeDasharray="3 4" dot={false} /><Scatter data={data} dataKey="yield">{data.map((entry, index) => <Cell key={index} fill={TASTE_COLORS[entry.taste]} />)}</Scatter></ComposedChart></ResponsiveContainer></div>;
}
