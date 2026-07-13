"use server";
import{revalidatePath}from"next/cache";import{redirect}from"next/navigation";import{z}from"zod";
import{requireUser}from"@/lib/supabase/auth";import{beanSchema,shotEditSchema,shotSchema,type BeanInput,type ShotEditInput,type ShotInput}from"@/lib/validation";import{calculateDialedScore}from"@/lib/calculations";

export type MutationResult={ok:boolean;message:string;id?:string;score?:number|null;coverage?:number};
export async function saveBean(input:BeanInput):Promise<MutationResult>{const parsed=beanSchema.safeParse(input);if(!parsed.success)return{ok:false,message:parsed.error.issues[0].message};const{supabase,userId}=await requireUser();const data=parsed.data;const payload={user_id:userId,name:data.name,roaster:data.roaster,roast_date:data.roastDate||null,origin:data.origin||null,process:data.process,roast_level:data.roastLevel,tasting_notes:(data.tastingNotes??"").split(",").map(x=>x.trim()).filter(Boolean),purchase_date:data.purchaseDate||null,price_cents:data.priceEuros===null?null:Math.round(data.priceEuros*100),package_grams:data.packageGrams,is_decaf:data.isDecaf};
  const result=data.id?await supabase.from("beans").update(payload).eq("id",data.id).eq("user_id",userId).select("id").single():await supabase.from("beans").insert(payload).select("id").single();if(result.error){console.error("saveBean failed",{code:result.error.code});return{ok:false,message:"Die Bohne konnte nicht gespeichert werden."}}await supabase.from("user_settings").update({last_bean_id:result.data.id}).eq("user_id",userId);revalidatePath("/app");revalidatePath("/app/beans");return{ok:true,message:data.id?"Bohne aktualisiert":"Bohne hinzugefügt",id:result.data.id}}

export async function archiveBean(id:string,archive:boolean):Promise<MutationResult>{const valid=z.string().uuid().safeParse(id);if(!valid.success)return{ok:false,message:"Ungültige Bohne."};const{supabase,userId}=await requireUser();const{error}=await supabase.from("beans").update({archived_at:archive?new Date().toISOString():null}).eq("id",id).eq("user_id",userId);if(error)return{ok:false,message:"Der Status konnte nicht geändert werden."};revalidatePath("/app/beans");return{ok:true,message:archive?"Bohne archiviert":"Bohne wiederhergestellt"}}

const setupSchema=z.object({displayName:z.string().trim().min(2).max(80),machineName:z.string().trim().min(1).max(120),grinderName:z.string().trim().min(1).max(120),autoFill:z.boolean(),tools:z.array(z.string()).max(20),suggestions:z.boolean(),roastWarning:z.boolean(),warningDays:z.number().int().min(1).max(365)});
export async function saveSetup(input:z.infer<typeof setupSchema>):Promise<MutationResult>{
  const parsed=setupSchema.safeParse(input);
  if(!parsed.success)return{ok:false,message:"Bitte prüfe die Setup-Angaben."};
  const{supabase,userId}=await requireUser();
  const upsertEquipment=async(type:"machine"|"grinder",name:string)=>{
    const existing=await supabase.from("equipment").select("id").eq("user_id",userId).eq("type",type).ilike("name",name).is("archived_at",null).maybeSingle();
    if(existing.error){console.error("load equipment failed",{type,code:existing.error.code});return null}
    if(existing.data)return existing.data.id;
    const created=await supabase.from("equipment").insert({user_id:userId,type,name}).select("id").single();
    if(created.error)console.error("create equipment failed",{type,code:created.error.code});
    return created.data?.id??null;
  };
  const[machineId,grinderId]=await Promise.all([upsertEquipment("machine",parsed.data.machineName),upsertEquipment("grinder",parsed.data.grinderName)]);
  if(!machineId||!grinderId)return{ok:false,message:"Das Equipment konnte nicht gespeichert werden."};
  const currentSettings=await supabase.from("user_settings").select("last_bean_id").eq("user_id",userId).maybeSingle();
  if(currentSettings.error)return{ok:false,message:"Die bisherigen Einstellungen konnten nicht geladen werden."};
  const settingsPayload={user_id:userId,default_machine_id:machineId,default_grinder_id:grinderId,last_bean_id:currentSettings.data?.last_bean_id??null,auto_fill:parsed.data.autoFill,default_prep_tools:parsed.data.tools,dial_in_suggestions_enabled:parsed.data.suggestions,roast_age_warning_enabled:parsed.data.roastWarning,roast_age_warning_days:parsed.data.warningDays};
  const[profile,settings]=await Promise.all([
    supabase.from("profiles").update({display_name:parsed.data.displayName}).eq("id",userId),
    supabase.from("user_settings").upsert(settingsPayload,{onConflict:"user_id"}).select("default_machine_id,default_grinder_id").single(),
  ]);
  if(profile.error||settings.error||settings.data?.default_machine_id!==machineId||settings.data?.default_grinder_id!==grinderId){
    console.error("save setup failed",{profileCode:profile.error?.code,settingsCode:settings.error?.code});
    return{ok:false,message:"Das Setup konnte nicht vollständig gespeichert werden."};
  }
  revalidatePath("/app","layout");
  revalidatePath("/app/setup");
  return{ok:true,message:"Setup wurde gespeichert"};
}

function shotPayload(userId:string,data:ShotInput,shotAt?:string){const scoreResult=calculateDialedScore({doseGrams:data.doseGrams,finalYieldGrams:data.finalYieldGrams,extractionSeconds:data.extractionSeconds,overallTasteRating:data.overallTasteRating,tasteBalance:data.taste,flow:data.flow,puck:data.puck,flowEvenness:data.flowEvenness,channeling:data.channeling,tds:data.tds});return{payload:{user_id:userId,bean_id:data.beanId,machine_id:data.machineId,grinder_id:data.grinderId,basket_id:data.basketId,...(shotAt?{shot_at:new Date(shotAt).toISOString()}:{shot_at:new Date().toISOString()}),grind_setting:data.grindSetting,dose_grams:data.doseGrams,temperature_c:data.temperatureC,preinfusion_seconds:data.preinfusionSeconds,prep_tools:data.prepTools,extraction_seconds:data.extractionSeconds,stop_weight_grams:data.stopWeightGrams,final_yield_grams:data.finalYieldGrams,taste:data.taste,flow:data.flow,puck:data.puck,notes:data.notes||null,overall_taste_rating:data.overallTasteRating,tds:data.tds,flow_evenness:data.flowEvenness,channeling:data.channeling,score:scoreResult.score,score_coverage:scoreResult.coverage,score_status:scoreResult.coverageLabel},scoreResult}}

async function validateShotRefs(supabase:Awaited<ReturnType<typeof requireUser>>["supabase"],userId:string,data:ShotInput){const ids=[data.machineId,data.grinderId,data.basketId].filter((id):id is string=>Boolean(id));const[bean,equipment]=await Promise.all([supabase.from("beans").select("id,name").eq("id",data.beanId).eq("user_id",userId).maybeSingle(),ids.length?supabase.from("equipment").select("id").eq("user_id",userId).in("id",ids):Promise.resolve({data:[],error:null})]);return{bean,equipmentOk:(equipment.data??[]).length===ids.length}}

export async function saveShot(input:ShotInput):Promise<MutationResult>{const parsed=shotSchema.safeParse(input);if(!parsed.success)return{ok:false,message:parsed.error.issues[0].message};const{supabase,userId}=await requireUser();const data=parsed.data;const{bean,equipmentOk}=await validateShotRefs(supabase,userId,data);if(!bean.data||!equipmentOk)return{ok:false,message:"Bohne oder Equipment gehören nicht zu deinem Konto."};const{payload,scoreResult}=shotPayload(userId,data);const{data:shot,error}=await supabase.from("shots").insert(payload).select("id").single();if(error){console.error("saveShot failed",{code:error.code});return{ok:false,message:"Der Shot konnte nicht gespeichert werden."}}await supabase.from("user_settings").update({last_bean_id:data.beanId}).eq("user_id",userId);revalidatePath("/app");revalidatePath("/app/shots");revalidatePath("/app/beans");return{ok:true,message:scoreResult.score===null?`${bean.data.name} · Score noch nicht berechenbar · ${scoreResult.coverage}% Datenabdeckung`:`${bean.data.name} · ${scoreResult.score} Punkte · ${scoreResult.coverage}% Datenabdeckung`,id:shot.id,score:scoreResult.score,coverage:scoreResult.coverage}}

export async function updateShot(id:string,input:ShotEditInput):Promise<MutationResult>{const validId=z.string().uuid().safeParse(id);if(!validId.success)return{ok:false,message:"Ungültiger Shot."};const parsed=shotEditSchema.safeParse(input);if(!parsed.success)return{ok:false,message:parsed.error.issues[0].message};const{supabase,userId}=await requireUser();const data=parsed.data;const{bean,equipmentOk}=await validateShotRefs(supabase,userId,data);if(!bean.data||!equipmentOk)return{ok:false,message:"Bohne oder Equipment gehören nicht zu deinem Konto."};const{payload,scoreResult}=shotPayload(userId,data,data.shotAt);const{data:shot,error}=await supabase.from("shots").update(payload).eq("id",validId.data).eq("user_id",userId).select("id").single();if(error){console.error("updateShot failed",{code:error.code});return{ok:false,message:"Der Shot konnte nicht aktualisiert werden."}}await supabase.from("user_settings").update({last_bean_id:data.beanId}).eq("user_id",userId);revalidatePath("/app");revalidatePath("/app/shots");revalidatePath(`/app/shots/${validId.data}`);revalidatePath(`/app/shots/${validId.data}/edit`);revalidatePath("/app/beans");return{ok:true,message:scoreResult.score===null?`${bean.data.name} · Score noch nicht berechenbar · ${scoreResult.coverage}% Datenabdeckung`:`${bean.data.name} · ${scoreResult.score} Punkte · ${scoreResult.coverage}% Datenabdeckung`,id:shot.id,score:scoreResult.score,coverage:scoreResult.coverage}}

export async function deleteShot(id:string):Promise<MutationResult>{const parsed=z.string().uuid().safeParse(id);if(!parsed.success)return{ok:false,message:"Ungültiger Shot."};const{supabase,userId}=await requireUser();const{error}=await supabase.from("shots").delete().eq("id",id).eq("user_id",userId);if(error)return{ok:false,message:"Der Shot konnte nicht gelöscht werden."};revalidatePath("/app");revalidatePath("/app/shots");redirect("/app/shots")}
