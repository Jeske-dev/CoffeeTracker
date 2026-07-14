import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/auth";
import { loadNewShotData } from "@/features/data/queries";
import { RECOMMENDATION_COLUMNS, SHOT_COLUMNS } from "@/features/data/columns";
import { toShot } from "@/features/data/normalize";
import { ShotWizard } from "@/components/shots/shot-wizard";
import type { ShotRow } from "@/types/database";
import type { RecommendationBundleRecord } from "@/types/domain";
import { RECOMMENDATION_ENGINE_VERSION } from "@/features/recommendations/types";

export default async function NewShotPage(props: PageProps<"/app/shots/new">) {
  const query = await props.searchParams;
  const recommendationId = typeof query.recommendation === "string" ? query.recommendation : null;
  const { supabase, userId } = await requireUser();
  const [appData, recommendationResult] = await Promise.all([
    loadNewShotData(userId, supabase),
    recommendationId ? supabase.from("recommendation_bundles").select(RECOMMENDATION_COLUMNS).eq("id", recommendationId).eq("user_id", userId).eq("engine_version", RECOMMENDATION_ENGINE_VERSION).eq("status", "applied").maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  const { beans, equipment, settings, latestShot, activeRecommendation } = appData;
  if (!beans.length) redirect("/app/beans/new");
  const requestedRecommendation = recommendationResult.data as RecommendationBundleRecord | null;
  const recommendation = requestedRecommendation ?? activeRecommendation;
  const recommendationMode = requestedRecommendation ? "apply" as const : "suggest" as const;
  let baseShot = latestShot;
  if (requestedRecommendation && latestShot?.id !== requestedRecommendation.source_shot_id) {
    const source = await supabase.from("shots").select(SHOT_COLUMNS).eq("id", requestedRecommendation.source_shot_id).eq("user_id", userId).maybeSingle();
    baseShot = source.data ? toShot(source.data as unknown as ShotRow) : latestShot;
  }
  return <ShotWizard userId={userId} beans={beans} equipment={equipment} settings={settings} lastShot={baseShot} recommendation={recommendation} recommendationMode={recommendationMode} />;
}
