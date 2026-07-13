"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type PwaInstallation = {
  isStandalone: boolean;
  isIOS: boolean;
  canPrompt: boolean;
  isInstallable: boolean;
  install: () => Promise<"accepted" | "dismissed" | "unavailable">;
};

const PwaInstallationContext = createContext<PwaInstallation | null>(null);

function standaloneNow() {
  if (typeof window === "undefined") return false;
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

function iosNow() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function PwaInstallationProvider({ children }: { children: React.ReactNode }) {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const syncStandalone = () => setIsStandalone(standaloneNow());
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const installed = () => {
      setPromptEvent(null);
      setIsStandalone(true);
    };

    queueMicrotask(() => {
      setIsIOS(iosNow());
      syncStandalone();
    });
    media.addEventListener("change", syncStandalone);
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", installed);
    return () => {
      media.removeEventListener("change", syncStandalone);
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  const install = useCallback(async () => {
    if (!promptEvent || isStandalone) return "unavailable" as const;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setPromptEvent(null);
    if (choice.outcome === "accepted") setIsStandalone(true);
    return choice.outcome;
  }, [isStandalone, promptEvent]);

  const value = useMemo<PwaInstallation>(() => ({
    isStandalone,
    isIOS,
    canPrompt: promptEvent !== null,
    isInstallable: !isStandalone && (promptEvent !== null || isIOS),
    install,
  }), [install, isIOS, isStandalone, promptEvent]);

  return <PwaInstallationContext.Provider value={value}>{children}</PwaInstallationContext.Provider>;
}

export function usePwaInstallation() {
  const value = useContext(PwaInstallationContext);
  if (!value) throw new Error("usePwaInstallation muss innerhalb des PwaInstallationProvider verwendet werden.");
  return value;
}
