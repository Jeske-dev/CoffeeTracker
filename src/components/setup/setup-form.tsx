"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Coffee, LogOut, Settings2, Timer, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { saveSetup } from "@/features/data/actions";
import type { Equipment, UserSettings } from "@/types/domain";

type Fields = { displayName: string; machineName: string; grinderName: string; warningDays: number };
const availableTools = ["WDT", "Tamper", "Puck Screen", "Leveler", "Papierfilter"];

export function SetupForm({ displayName, email, equipment, settings }: { displayName: string; email: string; equipment: Equipment[]; settings: UserSettings | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [autoFill, setAutoFill] = useState(settings?.auto_fill ?? true);
  const [selectedTools, setSelectedTools] = useState(settings?.default_prep_tools ?? availableTools.slice(0, 3));
  const [suggestions, setSuggestions] = useState(settings?.dial_in_suggestions_enabled ?? true);
  const [warning, setWarning] = useState(settings?.roast_age_warning_enabled ?? true);
  const { register, handleSubmit } = useForm<Fields>({ defaultValues: { displayName, machineName: equipment.find((item) => item.id === settings?.default_machine_id)?.name ?? "", grinderName: equipment.find((item) => item.id === settings?.default_grinder_id)?.name ?? "", warningDays: settings?.roast_age_warning_days ?? 45 } });
  const submit = (values: Fields) => startTransition(async () => {
    const result = await saveSetup({ ...values, warningDays: Number(values.warningDays), autoFill, tools: selectedTools, suggestions, roastWarning: warning });
    if (result.ok) {
      toast.success(result.message, { id: "setup-saved", description: "Maschine, Mühle und Einstellungen sind jetzt hinterlegt.", duration: 4000 });
      router.refresh();
    } else toast.error(result.message);
  });
  const signOut = async () => { await fetch("/auth/signout", { method: "POST" }); window.location.assign("/auth/login"); };

  return <form onSubmit={handleSubmit(submit)}>
    <header className="mx-0.5 mb-5 flex items-center justify-between"><div><h1 className="font-display text-[30px]">Dein Setup</h1><p className="mt-1 text-[11px] text-[var(--dialed-text-muted)]">Wird bei neuen Shots vorausgefüllt</p></div><Button type="submit" disabled={pending} className="rounded-xl bg-[var(--dialed-espresso)]">{pending ? "…" : "Speichern"}</Button></header>
    <SettingsCard title="Standard-Equipment">
      <Setting icon={<Coffee />} title="Siebträgermaschine" copy="Standard für neue Shots"><Input aria-label="Siebträgermaschine" className="w-[132px] text-right text-[10px]" list="machines" {...register("machineName", { required: true })} /><datalist id="machines">{equipment.filter((item) => item.type === "machine").map((item) => <option key={item.id}>{item.name}</option>)}</datalist></Setting>
      <Setting icon={<Settings2 />} title="Mühle" copy="Standard für neue Shots"><Input aria-label="Mühle" className="w-[132px] text-right text-[10px]" list="grinders" {...register("grinderName", { required: true })} /><datalist id="grinders">{equipment.filter((item) => item.type === "grinder").map((item) => <option key={item.id}>{item.name}</option>)}</datalist></Setting>
      <Setting icon={<Timer />} title="Automatisch vorausfüllen" copy="Maschine, Mühle & letzte Bohne"><Switch checked={autoFill} onCheckedChange={setAutoFill} /></Setting>
    </SettingsCard>
    <SettingsCard title="Standard-Puck-Prep"><div className="flex flex-wrap gap-2 px-4 pb-4">{availableTools.map((tool) => { const on = selectedTools.includes(tool); return <button type="button" key={tool} onClick={() => setSelectedTools(on ? selectedTools.filter((item) => item !== tool) : [...selectedTools, tool])} className={`min-h-11 rounded-full border px-3 text-[10px] ${on ? "border-[var(--dialed-sage)]/30 bg-[var(--dialed-sage-soft)] text-[var(--dialed-sage)]" : "bg-[var(--dialed-surface)]"}`}>{on ? "✓" : "＋"} {tool}</button>; })}</div></SettingsCard>
    <SettingsCard title="Smarte Hinweise"><Setting icon={<TrendingUp />} title="Dial‑in‑Vorschläge" copy="Aus Zeit, Ratio und Geschmack"><Switch checked={suggestions} onCheckedChange={setSuggestions} /></Setting><Setting icon={<Timer />} title="Röstalter warnen" copy={`Hinweis ab ${settings?.roast_age_warning_days ?? 45} Tagen`}><Switch checked={warning} onCheckedChange={setWarning} /></Setting></SettingsCard>
    <SettingsCard title="Account"><Setting icon={<span className="font-display text-lg">{displayName.charAt(0).toUpperCase()}</span>} title={email} copy="Anzeigename"><Input aria-label="Anzeigename" className="w-[120px] text-right text-[10px]" {...register("displayName", { required: true })} /></Setting><div className="border-t p-4"><Button type="button" onClick={signOut} variant="ghost" className="w-full rounded-full text-[var(--dialed-rose)]"><LogOut />Abmelden</Button></div></SettingsCard>
  </form>;
}

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) { return <section className="mb-3 overflow-hidden rounded-[24px] border bg-white"><h2 className="px-4 pt-4 pb-2.5 text-[10px] font-extrabold uppercase tracking-[.11em] text-[var(--dialed-text-muted)]">{title}</h2>{children}</section>; }
function Setting({ icon, title, copy, children }: { icon: React.ReactNode; title: string; copy: string; children: React.ReactNode }) { return <div className="grid min-h-[66px] grid-cols-[42px_1fr_auto] items-center gap-3 border-t px-4 py-3"><span className="grid size-[39px] place-items-center rounded-[13px] bg-[var(--dialed-surface-subtle)] [&_svg]:size-[19px]">{icon}</span><span><strong className="block text-xs">{title}</strong><small className="mt-1 block text-[9px] text-[var(--dialed-text-muted)]">{copy}</small></span>{children}</div>; }
