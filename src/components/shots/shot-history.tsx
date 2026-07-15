import { ShotTable } from "./shot-table";
import type { ShotSummary } from "@/types/domain";

export function ShotHistory({ shots }: { shots: ShotSummary[] }) {
  if (!shots.length) {
    return <div className="border border-dashed border-black p-10 text-center">
      <strong className="font-display text-xl font-semibold">Noch keine Shots</strong>
      <p className="mt-2 text-xs text-[var(--dialed-text-muted)]">Deine gespeicherten Extraktionen erscheinen hier.</p>
    </div>;
  }

  return <section aria-label="Shot-Historie">
    <ShotTable shots={shots} />
  </section>;
}
