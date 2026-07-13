"use client";
import { startTransition, useActionState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert,AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authSchema } from "@/lib/validation";
import type { AuthState } from "@/features/auth/actions";

type Mode="login"|"signup"|"forgot"|"update";
type Values={displayName?:string;email?:string;password?:string};
const initialAuthState: AuthState = { status: "idle", message: "" };
export function AuthForm({mode,action}:{mode:Mode;action:(state:AuthState,data:FormData)=>Promise<AuthState>}){
  const schema=mode==="signup"?authSchema:mode==="forgot"?z.object({email:z.email("Bitte gib eine gültige E-Mail-Adresse ein.")}):mode==="update"?z.object({password:z.string().min(8,"Mindestens 8 Zeichen.")}):authSchema.omit({displayName:true});
  const [state,formAction,pending]=useActionState(action,initialAuthState);
  const{register,handleSubmit,formState:{errors}}=useForm<Values>({resolver:zodResolver(schema) as Resolver<Values>});
  const submit=(values:Values)=>{const data=new FormData();Object.entries(values).forEach(([key,value])=>{if(value)data.set(key,value)});startTransition(()=>formAction(data))};
  return <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
    {mode==="signup"&&<Field id="displayName" label="Dein Name" error={errors.displayName?.message}><Input id="displayName" autoComplete="name" {...register("displayName")} /></Field>}
    {mode!=="update"&&<Field id="email" label="E-Mail" error={errors.email?.message}><Input id="email" type="email" autoComplete="email" placeholder="du@beispiel.de" {...register("email")} /></Field>}
    {mode!=="forgot"&&<Field id="password" label={mode==="update"?"Neues Passwort":"Passwort"} error={errors.password?.message}><Input id="password" type="password" autoComplete={mode==="login"?"current-password":"new-password"} {...register("password")} /></Field>}
    {state.message&&<Alert variant={state.status==="error"?"destructive":"default"}><AlertDescription>{state.message}</AlertDescription></Alert>}
    <Button type="submit" disabled={pending} className="h-12 w-full rounded-full bg-[var(--dialed-espresso)] text-white hover:bg-[var(--dialed-espresso-raised)]">{pending?"Einen Moment …":({login:"Anmelden",signup:"Konto erstellen",forgot:"Link anfordern",update:"Passwort speichern"})[mode]}</Button>
  </form>
}
function Field({id,label,error,children}:{id:string;label:string;error?:string;children:React.ReactNode}){return <div className="space-y-2"><Label htmlFor={id}>{label}</Label>{children}{error&&<p className="text-xs text-[var(--dialed-rose)]" role="alert">{error}</p>}</div>}
