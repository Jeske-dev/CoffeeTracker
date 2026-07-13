"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { authSchema } from "@/lib/validation";

export type AuthState = { status: "idle" | "success" | "error"; message: string; fields?: Record<string,string> };
const missingConfig: AuthState = { status: "error", message: "Supabase ist noch nicht konfiguriert. Bitte ergänze zuerst die Werte in .env.local." };
function isConfigured(){ return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY); }

function friendlyAuthError(message:string){
  if(message.includes("Invalid login")) return "E-Mail-Adresse oder Passwort sind nicht korrekt.";
  if(message.includes("Email not confirmed")) return "Bitte bestätige zuerst deine E-Mail-Adresse.";
  if(message.includes("already registered")) return "Für diese E-Mail-Adresse existiert bereits ein Konto.";
  if(message.includes("rate limit")) return "Zu viele Versuche. Bitte warte kurz und probiere es erneut.";
  return "Das hat leider nicht geklappt. Bitte prüfe deine Angaben und versuche es erneut.";
}

const loginSchema=authSchema.omit({displayName:true});
export async function loginAction(_state:AuthState,formData:FormData):Promise<AuthState>{
  const parsed=loginSchema.safeParse({email:formData.get("email"),password:formData.get("password")});
  if(!parsed.success)return{status:"error",message:parsed.error.issues[0].message};
  if(!isConfigured())return missingConfig;
  const supabase=await createClient();const{error}=await supabase.auth.signInWithPassword(parsed.data);
  if(error)return{status:"error",message:friendlyAuthError(error.message)};
  revalidatePath("/","layout");redirect("/app");
}

export async function signupAction(_state:AuthState,formData:FormData):Promise<AuthState>{
  const parsed=authSchema.safeParse({displayName:formData.get("displayName"),email:formData.get("email"),password:formData.get("password")});
  if(!parsed.success)return{status:"error",message:parsed.error.issues[0].message};
  if(!isConfigured())return missingConfig;
  const supabase=await createClient();const siteUrl=process.env.NEXT_PUBLIC_SITE_URL??"http://localhost:3000";
  const{data,error}=await supabase.auth.signUp({email:parsed.data.email,password:parsed.data.password,options:{data:{display_name:parsed.data.displayName},emailRedirectTo:`${siteUrl}/auth/callback`}});
  if(error)return{status:"error",message:friendlyAuthError(error.message)};
  if(data.session){revalidatePath("/","layout");redirect("/app")}
  return{status:"success",message:"Fast geschafft: Bitte bestätige den Link in deinem E-Mail-Postfach."};
}

const emailSchema=z.email("Bitte gib eine gültige E-Mail-Adresse ein.");
export async function forgotPasswordAction(_state:AuthState,formData:FormData):Promise<AuthState>{
  const parsed=emailSchema.safeParse(formData.get("email"));if(!parsed.success)return{status:"error",message:parsed.error.issues[0].message};
  if(!isConfigured())return missingConfig;
  const siteUrl=process.env.NEXT_PUBLIC_SITE_URL??"http://localhost:3000";const supabase=await createClient();
  const{error}=await supabase.auth.resetPasswordForEmail(parsed.data,{redirectTo:`${siteUrl}/auth/callback?next=/auth/update-password`});
  if(error)return{status:"error",message:friendlyAuthError(error.message)};
  return{status:"success",message:"Wenn ein Konto existiert, erhältst du jetzt einen Link zum Zurücksetzen."};
}

export async function updatePasswordAction(_state:AuthState,formData:FormData):Promise<AuthState>{
  const password=z.string().min(8,"Das Passwort muss mindestens 8 Zeichen haben.").safeParse(formData.get("password"));
  if(!password.success)return{status:"error",message:password.error.issues[0].message};
  if(!isConfigured())return missingConfig;
  const supabase=await createClient();const{error}=await supabase.auth.updateUser({password:password.data});
  if(error)return{status:"error",message:friendlyAuthError(error.message)};
  revalidatePath("/","layout");redirect("/app");
}
