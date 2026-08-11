import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./server";
import { measureServerOperation } from "@/lib/performance/server-timing";

export const getAuthContext = cache(async function getAuthContext(){return measureServerOperation("auth",1,async()=>{const supabase=await createClient();const{data,error}=await supabase.auth.getClaims();const sub=data?.claims?.sub;if(error||!sub)return null;return{supabase,userId:sub,email:typeof data.claims.email==="string"?data.claims.email:""}})});

export const requireUser = cache(async function requireUser(){
  const auth = await getAuthContext();
  if (!auth) redirect("/auth/login");
  return auth;
});
