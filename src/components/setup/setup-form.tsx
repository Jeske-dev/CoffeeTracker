"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { CalendarDays, Check, CircleAlert, LoaderCircle, LogOut, Plus, RefreshCw, Timer, TrendingUp, TriangleAlert, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { EquipmentIcon } from "@/components/entities/entity-icons";
import { InstallDialedCard } from "@/components/pwa/install-dialed-card";
import { saveSetup } from "@/features/data/actions";
import { usePrivateCache } from "@/hooks/use-private-cache";
import { usePrivateLogout } from "@/hooks/use-private-logout";
import type { Equipment, UserSettings } from "@/types/domain";

type Fields = { displayName: string; machineName: string; grinderName: string; warningDays: number };
type SetupPayload = Parameters<typeof saveSetup>[0];
const availableTools = ["WDT", "Tamper", "Puck Screen", "Leveler", "Papierfilter"];

function isValidSetup(payload: SetupPayload) {
  return payload.displayName.trim().length >= 2
    && payload.machineName.trim().length >= 1
    && payload.grinderName.trim().length >= 1
    && Number.isInteger(payload.warningDays)
    && payload.warningDays >= 1
    && payload.warningDays <= 365;
}

export function SetupForm({ userId, displayName, email, equipment, settings }: { userId: string; displayName: string; email: string; equipment: Equipment[]; settings: UserSettings | null }) {
  const { invalidateSetupData } = usePrivateCache();
  const logout = usePrivateLogout();
  const [autoFill, setAutoFill] = useState(settings?.auto_fill ?? true);
  const [selectedTools, setSelectedTools] = useState(settings?.default_prep_tools ?? availableTools.slice(0, 3));
  const [suggestions, setSuggestions] = useState(settings?.dial_in_suggestions_enabled ?? true);
  const [warning, setWarning] = useState(settings?.roast_age_warning_enabled ?? true);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const [editingTextField, setEditingTextField] = useState<"displayName" | "machineName" | "grinderName" | "warningDays" | null>(null);
  const defaultValues = useMemo<Fields>(() => ({
    displayName,
    machineName: equipment.find((item) => item.id === settings?.default_machine_id)?.name ?? "",
    grinderName: equipment.find((item) => item.id === settings?.default_grinder_id)?.name ?? "",
    warningDays: settings?.roast_age_warning_days ?? 45,
  }), [displayName, equipment, settings?.default_grinder_id, settings?.default_machine_id, settings?.roast_age_warning_days]);
  const { register, control } = useForm<Fields>({ defaultValues });
  const displayNameField = register("displayName", { required: true });
  const machineNameField = register("machineName", { required: true });
  const grinderNameField = register("grinderName", { required: true });
  const warningDaysField = register("warningDays", { required: true, min: 1, max: 365, valueAsNumber: true });
  const values = useWatch({ control });
  const payload = useMemo<SetupPayload>(() => ({
    displayName: values.displayName ?? defaultValues.displayName,
    machineName: values.machineName ?? defaultValues.machineName,
    grinderName: values.grinderName ?? defaultValues.grinderName,
    warningDays: Number(values.warningDays ?? defaultValues.warningDays),
    autoFill,
    tools: selectedTools,
    suggestions,
    roastWarning: warning,
  }), [autoFill, defaultValues, selectedTools, suggestions, values.displayName, values.grinderName, values.machineName, values.warningDays, warning]);
  const snapshot = JSON.stringify(payload);
  const valid = isValidSetup(payload);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(snapshot);
  const [failedSnapshot, setFailedSnapshot] = useState<string | null>(null);
  const lastQueuedSnapshot = useRef(snapshot);
  const latestSnapshot = useRef(snapshot);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  const enqueueSave = useCallback((nextPayload: SetupPayload, nextSnapshot: string) => {
    lastQueuedSnapshot.current = nextSnapshot;
    setFailedSnapshot(null);
    setSaveStatus("saving");
    saveQueue.current = saveQueue.current.then(async () => {
      try {
        const result = await saveSetup(nextPayload);
        if (!result.ok) {
          if (latestSnapshot.current === nextSnapshot) {
            if (lastQueuedSnapshot.current === nextSnapshot) lastQueuedSnapshot.current = "";
            setFailedSnapshot(nextSnapshot);
            setSaveStatus("error");
            toast.error(result.message, { id: "setup-autosave-error" });
          }
          return;
        }
        if (latestSnapshot.current === nextSnapshot) {
          setFailedSnapshot(null);
          setLastSavedSnapshot(nextSnapshot);
          setSaveStatus("saved");
        }
        try {
          await invalidateSetupData(userId);
        } catch (cacheError) {
          console.error("invalidate setup cache failed", cacheError);
        }
      } catch {
        if (latestSnapshot.current === nextSnapshot) {
          if (lastQueuedSnapshot.current === nextSnapshot) lastQueuedSnapshot.current = "";
          setFailedSnapshot(nextSnapshot);
          setSaveStatus("error");
          toast.error("Das Setup konnte nicht automatisch gespeichert werden.", { id: "setup-autosave-error" });
        }
      }
    });
  }, [invalidateSetupData, userId]);

  useEffect(() => {
    latestSnapshot.current = snapshot;
    if (!valid || editingTextField || snapshot === lastQueuedSnapshot.current) return;
    const timer = window.setTimeout(() => {
      enqueueSave(payload, snapshot);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [editingTextField, enqueueSave, payload, snapshot, valid]);

  const retrySave = useCallback(() => {
    if (valid && !editingTextField) enqueueSave(payload, snapshot);
  }, [editingTextField, enqueueSave, payload, snapshot, valid]);

  useEffect(() => {
    if (failedSnapshot !== snapshot) return;
    window.addEventListener("online", retrySave);
    return () => window.removeEventListener("online", retrySave);
  }, [failedSnapshot, retrySave, snapshot]);

  const finishTextEdit = (event: React.FocusEvent<HTMLInputElement>, onBlur: typeof machineNameField.onBlur) => {
    void onBlur(event);
    setEditingTextField(null);
    if (valid && snapshot !== lastQueuedSnapshot.current) {
      latestSnapshot.current = snapshot;
      enqueueSave(payload, snapshot);
    }
  };

  const commitDiscreteChange = (nextPayload: SetupPayload) => {
    if (editingTextField || !isValidSetup(nextPayload)) return;
    const nextSnapshot = JSON.stringify(nextPayload);
    latestSnapshot.current = nextSnapshot;
    enqueueSave(nextPayload, nextSnapshot);
  };

  const changeAutoFill = (checked: boolean) => {
    setAutoFill(checked);
    commitDiscreteChange({ ...payload, autoFill: checked });
  };

  const changeSuggestions = (checked: boolean) => {
    setSuggestions(checked);
    commitDiscreteChange({ ...payload, suggestions: checked });
  };

  const changeRoastWarning = (checked: boolean) => {
    setWarning(checked);
    commitDiscreteChange({ ...payload, roastWarning: checked });
  };

  const toggleTool = (tool: string) => {
    const nextTools = selectedTools.includes(tool) ? selectedTools.filter((item) => item !== tool) : [...selectedTools, tool];
    setSelectedTools(nextTools);
    commitDiscreteChange({ ...payload, tools: nextTools });
  };

  const signOut = async () => { try { await logout(); } catch { toast.error("Abmelden fehlgeschlagen. Bitte versuche es erneut."); } };
  const visibleSaveStatus = !valid
    ? "invalid"
    : failedSnapshot === snapshot
      ? "error"
      : saveStatus === "saving" || snapshot !== lastSavedSnapshot
        ? "saving"
        : "saved";
  const warningDaysValid = Number.isInteger(payload.warningDays) && payload.warningDays >= 1 && payload.warningDays <= 365;

  return <div>
    <header className="mx-0.5 mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-1"><div className="min-w-0"><h1 className="font-display text-[30px] tracking-normal">Dein Setup</h1><p className="mt-1 text-sm leading-5 text-[var(--dialed-text-secondary)]">Wird bei neuen Shots vorausgefüllt</p></div><AutoSaveStatus status={visibleSaveStatus} onRetry={retrySave} /></header>
    <SettingsCard title="Standard-Equipment">
      <Setting stackControl icon={<EquipmentIcon type="machine" />} title="Siebträgermaschine" copy="Standard für neue Shots"><Input aria-label="Siebträgermaschine" aria-invalid={!payload.machineName.trim()} maxLength={120} placeholder="z. B. Linea Mini" className="h-11 w-full text-left text-base sm:w-[220px]" list="machines" {...machineNameField} onFocus={() => setEditingTextField("machineName")} onBlur={(event) => finishTextEdit(event, machineNameField.onBlur)} /><datalist id="machines">{equipment.filter((item) => item.type === "machine").map((item) => <option key={item.id}>{item.name}</option>)}</datalist></Setting>
      <Setting stackControl icon={<EquipmentIcon type="grinder" />} title="Mühle" copy="Standard für neue Shots"><Input aria-label="Mühle" aria-invalid={!payload.grinderName.trim()} maxLength={120} placeholder="z. B. Niche Zero" className="h-11 w-full text-left text-base sm:w-[220px]" list="grinders" {...grinderNameField} onFocus={() => setEditingTextField("grinderName")} onBlur={(event) => finishTextEdit(event, grinderNameField.onBlur)} /><datalist id="grinders">{equipment.filter((item) => item.type === "grinder").map((item) => <option key={item.id}>{item.name}</option>)}</datalist></Setting>
      <Setting icon={<Timer />} title="Automatisch vorausfüllen" copy="Maschine, Mühle und letzte Bohne"><Switch aria-label="Automatisch vorausfüllen" className="after:-inset-x-4 after:-inset-y-[13px]" checked={autoFill} onCheckedChange={changeAutoFill} /></Setting>
    </SettingsCard>
    <SettingsCard title="Standard-Puck-Prep"><div className="flex flex-wrap gap-2 px-4 pb-4 pt-1">{availableTools.map((tool) => { const on = selectedTools.includes(tool); return <button type="button" key={tool} aria-pressed={on} onClick={() => toggleTool(tool)} className={`inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border px-3 text-sm font-medium ${on ? "border-[var(--dialed-sage)]/40 bg-[var(--dialed-sage-soft)] text-[var(--dialed-text)]" : "bg-[var(--dialed-surface)] text-[var(--dialed-text-secondary)]"}`}>{on ? <Check className="size-4 text-[var(--dialed-sage)]" /> : <Plus className="size-4" />}{tool}</button>; })}</div></SettingsCard>
    <SettingsCard title="Smarte Hinweise">
      <Setting icon={<TrendingUp />} title="Dial-in-Vorschläge" copy="Aus Zeit, Ratio und Geschmack"><Switch aria-label="Dial-in-Vorschläge" className="after:-inset-x-4 after:-inset-y-[13px]" checked={suggestions} onCheckedChange={changeSuggestions} /></Setting>
      <Setting icon={<Timer />} title="Röstalter warnen" copy={`Hinweis ab ${warningDaysValid ? payload.warningDays : "-"} Tagen`}><Switch aria-label="Röstalter warnen" className="after:-inset-x-4 after:-inset-y-[13px]" checked={warning} onCheckedChange={changeRoastWarning} /></Setting>
      <Setting stackControl icon={<CalendarDays />} title="Warnschwelle" copy="Alter der Röstung"><label className={`flex items-center justify-end gap-2 ${warning ? "" : "opacity-50"}`}><Input aria-label="Warnschwelle in Tagen" aria-invalid={!warningDaysValid} className="h-11 w-20 text-center text-base tabular" type="number" inputMode="numeric" min={1} max={365} disabled={!warning} {...warningDaysField} onFocus={() => setEditingTextField("warningDays")} onBlur={(event) => finishTextEdit(event, warningDaysField.onBlur)} /><span className="text-sm text-[var(--dialed-text-secondary)]">Tage</span></label></Setting>
    </SettingsCard>
    <InstallDialedCard />
    <SettingsCard title="Account"><Setting stackControl icon={<UserRound />} title={email} copy="Anzeigename"><Input aria-label="Anzeigename" aria-invalid={payload.displayName.trim().length < 2} maxLength={80} className="h-11 w-full text-left text-base sm:w-[220px]" {...displayNameField} onFocus={() => setEditingTextField("displayName")} onBlur={(event) => finishTextEdit(event, displayNameField.onBlur)} /></Setting><div className="border-t p-4"><Button type="button" onClick={signOut} variant="ghost" className="min-h-11 w-full rounded-[10px] text-[var(--dialed-rose)]"><LogOut />Abmelden</Button></div></SettingsCard>
  </div>;
}

function AutoSaveStatus({ status, onRetry }: { status: "saved" | "saving" | "error" | "invalid"; onRetry: () => void }) {
  const config = {
    saved: { icon: Check, label: "Gespeichert", iconClassName: "text-[var(--dialed-sage)]" },
    saving: { icon: LoaderCircle, label: "Speichert …", iconClassName: "text-[var(--dialed-text-muted)]" },
    error: { icon: TriangleAlert, label: "Nicht gespeichert", iconClassName: "text-[var(--dialed-rose)]" },
    invalid: { icon: CircleAlert, label: "Pflichtfelder prüfen", iconClassName: "text-[var(--dialed-rose)]" },
  }[status];
  const Icon = config.icon;
  return <span className="ml-auto inline-flex min-h-11 min-w-[112px] shrink-0 items-center justify-end gap-1.5 text-xs font-semibold text-[var(--dialed-text-secondary)]"><span role="status" aria-live="polite" aria-atomic="true" className="inline-flex items-center gap-1.5"><Icon className={`size-4 ${config.iconClassName} ${status === "saving" ? "animate-spin" : ""}`} />{config.label}</span>{status === "error" ? <button type="button" onClick={onRetry} aria-label="Speichern erneut versuchen" title="Speichern erneut versuchen" className="ml-1 grid size-11 shrink-0 place-items-center rounded-full text-[var(--dialed-rose)] hover:bg-[var(--dialed-rose-soft)]"><RefreshCw className="size-4" /></button> : null}</span>;
}

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) { return <section className="mb-4 overflow-hidden rounded-[18px] border bg-white"><h2 className="px-4 pb-3 pt-4 text-xs font-bold uppercase tracking-normal text-[var(--dialed-text-secondary)]">{title}</h2>{children}</section>; }
function Setting({ icon, title, copy, children, stackControl = false }: { icon: React.ReactNode; title: string; copy: string; children: React.ReactNode; stackControl?: boolean }) {
  return <div className={`grid min-h-[72px] items-center gap-x-3 gap-y-3 border-t px-4 py-3.5 ${stackControl ? "grid-cols-[40px_minmax(0,1fr)] sm:grid-cols-[40px_minmax(0,1fr)_minmax(180px,auto)]" : "grid-cols-[40px_minmax(0,1fr)_auto]"}`}><span className="grid size-10 place-items-center rounded-[10px] bg-[var(--dialed-surface-subtle)] [&_svg]:size-5">{icon}</span><span className="min-w-0"><strong className="block break-words text-sm leading-5">{title}</strong><small className="mt-0.5 block text-xs leading-4 text-[var(--dialed-text-secondary)]">{copy}</small></span><div className={stackControl ? "col-span-2 col-start-1 min-w-0 sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:justify-self-end" : "col-start-3 row-start-1"}>{children}</div></div>;
}
