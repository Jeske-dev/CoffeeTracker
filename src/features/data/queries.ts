import { createClient } from "@/lib/supabase/server";
import type { Bean,Equipment,Shot,ShotWithBean,UserSettings } from "@/types/domain";

export async function loadAppData(userId:string){
  const supabase=await createClient();
  const[profileResult,settingsResult,beansResult,equipmentResult,shotsResult]=await Promise.all([
    supabase.from("profiles").select("*").eq("id",userId).maybeSingle(),
    supabase.from("user_settings").select("*").eq("user_id",userId).maybeSingle(),
    supabase.from("beans").select("*").eq("user_id",userId).order("created_at",{ascending:false}),
    supabase.from("equipment").select("*").eq("user_id",userId).order("created_at",{ascending:true}),
    supabase.from("shots").select("*").eq("user_id",userId).order("shot_at",{ascending:false}).limit(100),
  ]);
  const beans=(beansResult.data??[])as Bean[];const beanMap=new Map(beans.map(bean=>[bean.id,bean]));
  const shots=((shotsResult.data??[])as Shot[]).map(shot=>({...shot,beans:beanMap.get(shot.bean_id)??null}))as ShotWithBean[];
  return{profile:profileResult.data,settings:settingsResult.data as UserSettings|null,beans,equipment:(equipmentResult.data??[])as Equipment[],shots,error:profileResult.error??settingsResult.error??beansResult.error??equipmentResult.error??shotsResult.error};
}
