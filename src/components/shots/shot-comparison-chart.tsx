"use client";

import { CartesianGrid, Cell, ComposedChart, ReferenceArea, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from "recharts";
import { brewRatio, TASTE_COLORS } from "@/lib/calculations";
import { formatRatio, formatTime } from "@/lib/formatting";
import type { ShotWithBean } from "@/types/domain";

type Point = {
  id: string;
  date: string;
  name: string;
  time: number;
  ratio: number;
  score: number | null;
  taste: keyof typeof TASTE_COLORS | "unknown";
  current: boolean;
};

export function ShotComparisonChart({ shot, shots }: { shot: ShotWithBean; shots: ShotWithBean[] }) {
  const currentRatio = brewRatio(shot.final_yield_grams, shot.dose_grams);
  if (shot.extraction_seconds === null || currentRatio === null) return <EmptyChart text="Für den Vergleich fehlen Zeit, Dosis oder Yield." />;

  const candidates = shots.filter((item) => item.id !== shot.id && item.extraction_seconds !== null && item.final_yield_grams !== null && item.dose_grams !== null);
  const sameBean = candidates.filter((item) => item.bean_id === shot.bean_id);
  const doseSimilar = candidates.filter((item) => shot.dose_grams !== null && item.dose_grams !== null && Math.abs(item.dose_grams - shot.dose_grams) <= 2.5);
  const pool = sameBean.length >= 2 ? sameBean : doseSimilar.length >= 2 ? doseSimilar : candidates;
  const nearest = [...pool].sort((a, b) => similarity(shot, a) - similarity(shot, b)).slice(0, 12);
  const peers: Point[] = nearest.map(toPoint).filter(Boolean) as Point[];
  const current: Point = { id: shot.id, date: formatDate(shot.shot_at), name: shot.beans?.name ?? "Dieser Shot", time: shot.extraction_seconds, ratio: currentRatio, score: shot.score, taste: shot.taste ?? "unknown", current: true };
  const data = [...peers, current].sort((a, b) => +new Date(shots.find((item) => item.id === a.id)?.shot_at ?? shot.shot_at) - +new Date(shots.find((item) => item.id === b.id)?.shot_at ?? shot.shot_at));
  const ratios = data.map((item) => item.ratio);
  const times = data.map((item) => item.time);
  const xMin = Math.min(20, Math.floor(Math.min(...times) - 2));
  const xMax = Math.max(40, Math.ceil(Math.max(...times) + 2));
  const yMin = Math.max(1.2, Math.min(1.75, Math.floor((Math.min(...ratios) - .15) * 10) / 10));
  const yMax = Math.min(3, Math.max(2.2, Math.ceil((Math.max(...ratios) + .15) * 10) / 10));

  return <div className="h-[238px] w-full" aria-label="Shot-Vergleichsdiagramm">
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart margin={{ top: 12, right: 8, bottom: 2, left: -18 }}>
        <CartesianGrid stroke="rgba(48,32,25,.08)" strokeDasharray="3 5" />
        <XAxis type="number" dataKey="time" domain={[xMin, xMax]} tick={{ fontSize: 9, fill: "#8D7E74" }} unit=" s" />
        <YAxis type="number" dataKey="ratio" domain={[yMin, yMax]} tick={{ fontSize: 9, fill: "#8D7E74" }} tickFormatter={(value) => `1:${value.toFixed(1)}`} />
        <ReferenceArea x1={25} x2={32} y1={1.8} y2={2.15} fill="#DFE7DC" fillOpacity={.82} stroke="#6F806F" strokeDasharray="4 4" />
        <Tooltip cursor={{ stroke: "#C8804F", strokeDasharray: "3 3" }} content={({ active, payload }) => {
          const point = payload?.[0]?.payload as Point | undefined;
          return active && point ? <div className="rounded-xl border bg-white p-2 text-[10px] shadow-lg"><strong>{point.current ? "Dieser Shot" : point.name}</strong><p>{point.date} · {formatTime(point.time)}<br />{formatRatio(point.ratio)} · Score {point.score ?? "—"}</p></div> : null;
        }} />
        <Scatter data={peers} dataKey="ratio" name="Ähnliche Shots">{peers.map((entry) => <Cell key={entry.id} fill={entry.taste === "unknown" ? "#b8ada6" : TASTE_COLORS[entry.taste]} opacity={.62} />)}</Scatter>
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

function EmptyChart({ text }: { text: string }) { return <div className="grid h-[238px] place-items-center rounded-[18px] bg-[var(--dialed-surface-subtle)] px-6 text-center text-xs leading-5 text-[var(--dialed-text-muted)]">{text}</div>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short" }).format(new Date(value)); }
function toPoint(shot: ShotWithBean): Point | null { const ratio = brewRatio(shot.final_yield_grams, shot.dose_grams); return shot.extraction_seconds !== null && ratio !== null ? { id: shot.id, date: formatDate(shot.shot_at), name: shot.beans?.name ?? "Shot", time: shot.extraction_seconds, ratio, score: shot.score, taste: shot.taste ?? "unknown", current: false } : null; }
function similarity(current: ShotWithBean, candidate: ShotWithBean) { const dose = current.dose_grams !== null && candidate.dose_grams !== null ? Math.abs(current.dose_grams - candidate.dose_grams) : 6; const bean = current.bean_id === candidate.bean_id ? 0 : 5; const score = current.score !== null && candidate.score !== null ? Math.abs(current.score - candidate.score) / 25 : 1; return bean + dose + score; }
