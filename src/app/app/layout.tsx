import { redirect } from "next/navigation";
import { AppFrame } from "@/components/app-shell/app-frame";
import { createClient } from "@/lib/supabase/server";
export default async function ProtectedLayout({children}:{children:React.ReactNode}){const supabase=await createClient();const {data}=await supabase.auth.getClaims();if(!data?.claims)redirect("/auth/login");return <AppFrame>{children}</AppFrame>}
