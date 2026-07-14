"use client";

import { useState } from "react";
import { AppWindow, BadgeInfo, BookOpen, CheckCircle2, Download, MoreVertical, Plus, Share2, Smartphone } from "lucide-react";
import packageJson from "../../../package.json";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePwaInstallation } from "@/hooks/use-pwa-installation";

export function InstallDialedCard() {
  const { isStandalone, isIOS, canPrompt, isInstallable, install } = usePwaInstallation();
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  const primary = async () => {
    if (canPrompt) {
      await install();
      return;
    }
    setInstructionsOpen(true);
  };

  const actionLabel = canPrompt ? "Dialed installieren" : isIOS ? "iOS-Anleitung" : "Installationsanleitung";
  const status = isStandalone ? "Installiert" : isInstallable ? "Installierbar" : "Im Browser geöffnet";

  return <>
    <section className="mb-4 overflow-hidden border bg-white"><h2 className="px-4 pb-3 pt-4 text-[10px] font-semibold tracking-[.1em] text-[var(--dialed-text-secondary)] uppercase">App</h2>{isStandalone ? <StatusRow icon={<CheckCircle2 />} title="Dialed ist auf diesem Gerät installiert." copy="Öffnet im Standalone-Modus ohne Browserleiste" /> : <><StatusRow icon={<AppWindow />} title="Installationsstatus" copy={status}><Button type="button" onClick={primary} className="min-h-11 w-full bg-black px-3 text-white sm:w-auto">{canPrompt ? <Download /> : <BookOpen />}{actionLabel}</Button></StatusRow><StatusRow icon={<Smartphone />} title="PWA-Status" copy={isInstallable ? "Bereit zur Installation" : "Über das Browsermenü installierbar"} /></>}<StatusRow icon={<BadgeInfo />} title="App-Version" copy={packageJson.version} /></section>
    <InstallationSheet open={instructionsOpen} onOpenChange={setInstructionsOpen} isIOS={isIOS} />
  </>;
}

function StatusRow({ icon, title, copy, children }: { icon: React.ReactNode; title: string; copy: string; children?: React.ReactNode }) {
  return <div className={`grid min-h-[76px] grid-cols-[40px_minmax(0,1fr)] items-center gap-x-3 gap-y-3 border-t px-4 py-4 ${children ? "sm:grid-cols-[40px_minmax(0,1fr)_auto]" : ""}`}><span className="grid size-10 place-items-center border bg-[var(--dialed-surface-subtle)] text-black [&_svg]:size-5">{icon}</span><span className="min-w-0"><strong className="block break-words text-sm font-semibold leading-5">{title}</strong><small className="mt-0.5 block text-xs leading-4 text-[var(--dialed-text-secondary)]">{copy}</small></span>{children ? <div className="col-span-2 min-w-0 sm:col-span-1 sm:col-start-3 sm:row-start-1">{children}</div> : null}</div>;
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

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="top-auto bottom-0 left-0 max-w-none translate-x-0 translate-y-0 gap-3 border-x-0 border-b-0 px-6 pt-6 pb-[calc(24px+env(safe-area-inset-bottom))] sm:left-1/2 sm:max-w-md sm:-translate-x-1/2 sm:border" showCloseButton><DialogHeader><DialogTitle className="font-display text-2xl font-semibold">{isIOS ? "Dialed auf iPhone & iPad" : "Dialed installieren"}</DialogTitle><DialogDescription className="text-sm leading-5">{isIOS ? "Die Installation wird direkt in Safari abgeschlossen." : "Die Bezeichnung kann je nach Browser leicht abweichen."}</DialogDescription></DialogHeader><ol className="grid gap-2">{steps.map(([Icon, text], index) => <li key={text} className="grid min-h-12 grid-cols-[36px_minmax(0,1fr)] items-center gap-3 border bg-[var(--dialed-surface-subtle)] px-3 py-2"><span className="relative grid size-9 place-items-center border border-black bg-white text-black"><Icon className="size-4" /><small className="absolute -right-1 -top-1 grid size-[18px] place-items-center bg-black text-[10px] font-bold text-white">{index + 1}</small></span><span className="text-sm leading-5">{text}</span></li>)}</ol></DialogContent></Dialog>;
}
