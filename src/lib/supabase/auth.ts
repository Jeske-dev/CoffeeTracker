import { redirect } from "next/navigation";
import { createClient } from "./server";

export async function requireUser(){const supabase=await createClient();const{data,error}=await supabase.auth.getClaims();const sub=data?.claims?.sub;if(error||!sub)redirect("/auth/login");return{supabase,userId:sub,email:typeof data.claims.email==="string"?data.claims.email:""}}
