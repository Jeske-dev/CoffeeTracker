import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/auth";
import { loadNewShotData } from "@/features/data/queries";
import { ShotWizard } from "@/components/shots/shot-wizard";

export default async function NewShotPage() {
  const { supabase, userId } = await requireUser();
  const appData = await loadNewShotData(userId, supabase);
  const { beans, equipment, settings, latestShot, stopWeightHistory, activeRecommendation } = appData;
  if (!beans.length) redirect("/app/beans/new");
  const recommendation = settings?.dial_in_suggestions_enabled === false ? null : activeRecommendation;
  return <ShotWizard userId={userId} beans={beans} equipment={equipment} settings={settings} lastShot={latestShot} recommendation={recommendation} stopWeightHistory={stopWeightHistory} />;
}
