"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;

    let active = true;
    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
        if (!active) return;
        await registration.update();
        registration.waiting?.postMessage("SKIP_WAITING");
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) worker.postMessage("SKIP_WAITING");
          });
        });
      } catch (error) {
        console.warn("Service Worker konnte nicht registriert werden.", error);
      }
    };

    void register();
    const update = () => { void navigator.serviceWorker.getRegistration().then((registration) => registration?.update()); };
    window.addEventListener("online", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      active = false;
      window.removeEventListener("online", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return null;
}
