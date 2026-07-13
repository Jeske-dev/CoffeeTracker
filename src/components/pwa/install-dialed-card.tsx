"use client";

import { useEffect, useState } from "react";
import { AppWindow, CheckCircle2, Download, MoreVertical, Plus, Share2, Smartphone } from "lucide-react";
import packageJson from "../../../package.json";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePwaInstallation } from "@/hooks/use-pwa-installation";

const VISITS_KEY = "dialed:pwa-visits";
const VISIT_SESSION_KEY = "dialed:pwa-visit-counted";
const DISMISSED_UNTIL_KEY = "dialed:pwa-dismissed-until";
const DISMISS_MS = 14 * 24 * 60 * 60 * 1000;

export function InstallDialedCard({ variant, shotCount = 0 }: { variant: "dashboard" | "settings"; shotCount?: number }) {
  const { isStandalone, isIOS, canPrompt, isInstallable, install } = usePwaInstallation();
  const [eligible, setEligible] = useState(variant === "settings");
  const [hidden, setHidden] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  useEffect(() => {
    if (variant === "settings") return;
    let visits = Number(window.localStorage.getItem(VISITS_KEY) ?? "0");
    if (!window.sessionStorage.getItem(VISIT_SESSION_KEY)) {
      visits += 1;
      window.localStorage.setItem(VISITS_KEY, String(visits));
      window.sessionStorage.setItem(VISIT_SESSION_KEY, "1");
    }
    const dismissedUntil = Number(window.localStorage.getItem(DISMISSED_UNTIL_KEY) ?? "0");
    const frame = window.requestAnimationFrame(() => setEligible((shotCount >= 2 || visits >= 3) && dismissedUntil <= Date.now()));
    return () => window.cancelAnimationFrame(frame);
  }, [shotCount, variant]);

  const primary = async () => {
    if (canPrompt) {
      const result = await install();
      if (result === "accepted") setHidden(true);
      return;
    }
    setInstructionsOpen(true);
  };
  const dismiss = () => {
    window.localStorage.setItem(DISMISSED_UNTIL_KEY, String(Date.now() + DISMISS_MS));
    setHidden(true);
  };

  if (variant === "dashboard" && (!eligible || hidden || isStandalone)) return null;

  const actionLabel = canPrompt ? (variant === "settings" ? "Dialed installieren" : "App installieren") : isIOS ? (variant === "settings" ? "iOS-Anleitung" : "So geht’s") : "Installationsanleitung";
  const status = isStandalone ? "Installiert" : isInstallable ? "Installierbar" : "Im Browser geöffnet";

  return <>
    {variant === "dashboard" ? <section className="mt-3 flex items-start gap-3 rounded-lg border bg-white p-4 shadow-[var(--shadow-sm)]"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--dialed-crema-soft)] text-[var(--dialed-espresso)]"><Smartphone className="size-5" /></span><div className="min-w-0 flex-1"><h2 className="text-sm font-bold">Dialed als App nutzen</h2><p className="mt-1 text-[11px] leading-4 text-[var(--dialed-text-secondary)]">Öffne Dialed direkt vom Homescreen – ohne Browserleiste.</p><div className="mt-3 flex flex-wrap gap-2"><Button type="button" onClick={primary} className="min-h-11 rounded-full bg-[var(--dialed-espresso)] px-4"><Download />{actionLabel}</Button><Button type="button" variant="ghost" onClick={dismiss} className="min-h-11 rounded-full px-4">Später</Button></div></div></section> : <section className="mb-3 overflow-hidden rounded-[24px] border bg-white"><h2 className="px-4 pt-4 pb-2.5 text-[10px] font-extrabold uppercase tracking-[.11em] text-[var(--dialed-text-muted)]">App</h2>{isStandalone ? <StatusRow icon={<CheckCircle2 />} title="Dialed ist auf diesem Gerät installiert." copy="Öffnet im Standalone-Modus ohne Browserleiste" /> : <><StatusRow icon={<AppWindow />} title="Installationsstatus" copy={status}><Button type="button" onClick={primary} className="min-h-11 rounded-full bg-[var(--dialed-espresso)] px-3 text-[10px]">{actionLabel}</Button></StatusRow><StatusRow icon={<Smartphone />} title="PWA-Status" copy={isInstallable ? "Bereit zur Installation" : "Über das Browsermenü installierbar"} /></>}<StatusRow icon={<span className="font-mono text-xs">v</span>} title="App-Version" copy={packageJson.version} /></section>}
    <InstallationSheet open={instructionsOpen} onOpenChange={setInstructionsOpen} isIOS={isIOS} />
  </>;
}

function StatusRow({ icon, title, copy, children }: { icon: React.ReactNode; title: string; copy: string; children?: React.ReactNode }) {
  return <div className="grid min-h-[66px] grid-cols-[42px_1fr_auto] items-center gap-3 border-t px-4 py-3"><span className="grid size-[39px] place-items-center rounded-[13px] bg-[var(--dialed-surface-subtle)] text-[var(--dialed-espresso)] [&_svg]:size-[19px]">{icon}</span><span className="min-w-0"><strong className="block text-xs">{title}</strong><small className="mt-1 block text-[9px] leading-4 text-[var(--dialed-text-muted)]">{copy}</small></span>{children}</div>;
}

function InstallationSheet({ open, onOpenChange, isIOS }: { open: boolean; onOpenChange: (open: boolean) => void; isIOS: boolean }) {
  const steps = isIOS ? [
    [Share2, "Tippe in Safari auf „Teilen“."],
    [Plus, "Wähle „Zum Home-Bildschirm“."],
    [AppWindow, "Aktiviere „Als Web-App öffnen“."],
    [CheckCircle2, "Tippe auf „Hinzufügen“."],
  ] as const : [
    [MoreVertical, "Öffne das Menü deines Browsers."],
    [Download, "Wähle „App installieren“ oder „Zum Startbildschirm“."],
    [CheckCircle2, "Bestätige die Installation."],
  ] as const;

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="top-auto bottom-0 left-0 max-w-none translate-x-0 translate-y-0 gap-3 rounded-t-[24px] rounded-b-none px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom))] sm:left-1/2 sm:max-w-md sm:-translate-x-1/2" showCloseButton><DialogHeader><DialogTitle className="font-display text-2xl">{isIOS ? "Dialed auf iPhone & iPad" : "Dialed installieren"}</DialogTitle><DialogDescription>{isIOS ? "Die Installation wird direkt in Safari abgeschlossen." : "Die Bezeichnung kann je nach Browser leicht abweichen."}</DialogDescription></DialogHeader><ol className="grid gap-2">{steps.map(([Icon, text], index) => <li key={text} className="grid min-h-12 grid-cols-[34px_1fr] items-center gap-3 rounded-lg bg-[var(--dialed-surface-subtle)] px-3 py-2"><span className="relative grid size-8 place-items-center rounded-full bg-white text-[var(--dialed-espresso)]"><Icon className="size-4" /><small className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-[var(--dialed-crema)] text-[8px] font-bold text-white">{index + 1}</small></span><span className="text-xs leading-5">{text}</span></li>)}</ol></DialogContent></Dialog>;
}
