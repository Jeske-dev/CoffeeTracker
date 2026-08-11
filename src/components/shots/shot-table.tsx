"use client";

import { useRouter } from "next/navigation";
import { CalendarDays, CircleStop, Coffee, Gauge, Scale, Timer, type LucideIcon } from "lucide-react";
import { BeanIcon, EntityIconFrame } from "@/components/entities/entity-icons";
import { formatDateTime, formatTime, formatWeight } from "@/lib/formatting";
import type { ShotSummary } from "@/types/domain";
import { TasteBadge } from "./shot-visuals";

const tableDateFormatter = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", timeZone: "Europe/Berlin" });

export function ShotTable({ shots }: { shots: ShotSummary[] }) {
  const router = useRouter();

  const openShot = (id: string) => router.push(`/app/shots/${id}`);
  const prefetchShot = (id: string) => router.prefetch(`/app/shots/${id}`);

  return <div className="overflow-hidden border-y border-black bg-white">
    <table className="w-full table-fixed border-collapse text-left text-xs">
      <colgroup>
        <col style={{ width: "30%" }} />
        {[0, 1, 2, 3, 4].map((column) => <col key={column} style={{ width: "14%" }} />)}
      </colgroup>
      <thead>
        <tr className="border-b border-black bg-white text-black">
          <ColumnHeader icon={CalendarDays} label="Datum" />
          <ColumnHeader icon={Gauge} label="Mahlgrad" />
          <ColumnHeader icon={Timer} label="Zeit" />
          <ColumnHeader icon={CircleStop} label="Stop-Gewicht" />
          <ColumnHeader icon={Coffee} label="Finales Gewicht" />
          <ColumnHeader icon={Scale} label="Geschmack" />
        </tr>
      </thead>
      <tbody>
        {shots.map((shot) => {
          const tone = beanTone(shot.bean_id);
          return <tr
            key={shot.id}
            role="link"
            tabIndex={0}
            aria-label={`Shot mit ${shot.beans?.name ?? "unbekannter Bohne"} vom ${formatDateTime(shot.shot_at)} öffnen`}
            onClick={() => openShot(shot.id)}
            onMouseEnter={() => prefetchShot(shot.id)}
            onFocus={() => prefetchShot(shot.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openShot(shot.id);
              }
            }}
            className="group cursor-pointer border-b border-[var(--crema-outline-soft)] last:border-b-0 hover:bg-[var(--crema-surface-low)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-black"
          >
            <td className="px-1 py-4">
              <div data-bean-tone={tone.key} title={shot.beans?.name ?? "Unbekannte Bohne"} className="flex min-w-0 items-center gap-1.5">
                <EntityIconFrame style={tone.style}><BeanIcon origin={shot.beans?.origin} /></EntityIconFrame>
                <time dateTime={shot.shot_at} className="min-w-0 truncate text-[11px] font-semibold tabular text-[var(--dialed-text-secondary)]">{formatTableDate(shot.shot_at)}</time>
              </div>
            </td>
            <CompactCell label="Mahlgrad" value={shot.grind_setting ?? "—"} />
            <CompactCell label="Zeit" value={compactUnit(formatTime(shot.extraction_seconds), "s")} unit="s" />
            <CompactCell label="Stop-Gewicht" value={compactUnit(formatWeight(shot.stop_weight_grams), "g")} unit="g" />
            <CompactCell label="Finales Gewicht" value={compactUnit(formatWeight(shot.final_yield_grams), "g")} unit="g" />
            <td className="px-0.5 py-4 text-center"><TasteBadge taste={shot.taste} iconOnly /></td>
          </tr>;
        })}
      </tbody>
    </table>
  </div>;
}

function ColumnHeader({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return <th scope="col" title={label} className="px-0.5 py-3 text-center font-bold">
    <span className="inline-grid place-items-center"><Icon aria-hidden="true" className="size-4" /><span className="sr-only">{label}</span></span>
  </th>;
}

function CompactCell({ label, value, unit }: { label: string; value: string; unit?: string }) {
  const accessibleValue = value === "—" || !unit ? value : `${value} ${unit}`;
  return <td
    aria-label={`${label}: ${accessibleValue}`}
    title={`${label}: ${accessibleValue}`}
    className="px-0 py-4 text-center text-[11px] font-semibold tabular min-[360px]:text-xs"
  >
    <span className="inline-flex max-w-full items-baseline justify-center whitespace-nowrap">
      {value}
      {value !== "—" && unit ? <><span aria-hidden="true"> </span><span className="text-[9px] text-[var(--dialed-text-secondary)] min-[360px]:text-[10px]">{unit}</span></> : null}
    </span>
  </td>;
}

function compactUnit(value: string, unit: "g" | "s") {
  return value === "—" ? value : value.replace(` ${unit}`, "");
}

function formatTableDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : tableDateFormatter.format(date);
}

function beanTone(beanId: string) {
  const hash = [...beanId].reduce((value, character) => Math.imul(value ^ character.charCodeAt(0), 16_777_619) >>> 0, 2_166_136_261);
  const lightness = 82 + (hash >>> 15) % 13;
  return {
    key: `gray-${lightness}`,
    style: {
      backgroundColor: `hsl(0 0% ${lightness}%)`,
      color: "#000000",
    },
  };
}
