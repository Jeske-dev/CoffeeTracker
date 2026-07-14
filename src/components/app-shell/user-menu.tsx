"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, LogOut, Mail, UserRound } from "lucide-react";
import { usePrivateLogout } from "@/hooks/use-private-logout";

type UserMenuProps = {
  displayName: string;
  email: string;
  registeredLabel: string;
};

export function UserMenu({ displayName, email, registeredLabel }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const logout = usePrivateLogout();
  const rootRef = useRef<HTMLDivElement>(null);
  const initial = displayName.charAt(0).toUpperCase() || "D";

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
    }
  };

  return <div className="relative z-40" ref={rootRef}>
    <button
      type="button"
      aria-label="Benutzermenü öffnen"
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={() => setOpen((current) => !current)}
      className="grid size-11 place-items-center border border-black bg-black font-display text-xl font-semibold text-white hover:bg-[#1b1b1b]"
    >{initial}</button>
    {open && <div role="menu" aria-label="Benutzerkonto" className="absolute top-[calc(100%+8px)] right-0 w-[min(310px,calc(100vw-48px))] overflow-hidden border border-black bg-white">
      <div className="border-b p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center border border-black bg-[var(--crema-surface-low)] text-black"><UserRound className="size-5"/></span>
          <div className="min-w-0"><strong className="block truncate font-display text-lg font-semibold">{displayName}</strong><span className="text-[10px] font-semibold tracking-[.08em] text-[var(--dialed-text-muted)] uppercase">Dialed Account</span></div>
        </div>
      </div>
      <dl className="space-y-3 px-4 py-3 text-[11px]">
        <div className="grid grid-cols-[20px_1fr] items-start gap-2"><Mail className="mt-0.5 size-4 text-[var(--dialed-text-muted)]"/><div><dt className="text-[9px] uppercase tracking-wide text-[var(--dialed-text-muted)]">E-Mail</dt><dd className="mt-0.5 truncate">{email}</dd></div></div>
        <div className="grid grid-cols-[20px_1fr] items-start gap-2"><CalendarDays className="mt-0.5 size-4 text-[var(--dialed-text-muted)]"/><div><dt className="text-[9px] uppercase tracking-wide text-[var(--dialed-text-muted)]">Registriert</dt><dd className="mt-0.5">{registeredLabel}</dd></div></div>
      </dl>
      <div className="border-t p-2">
        <button role="menuitem" type="button" disabled={signingOut} onClick={signOut} className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-xs font-semibold tracking-[.08em] text-[var(--dialed-rose)] uppercase hover:bg-[var(--dialed-rose-soft)] disabled:opacity-60"><LogOut className="size-4"/>{signingOut ? "Wird abgemeldet …" : "Abmelden"}</button>
      </div>
    </div>}
  </div>;
}
