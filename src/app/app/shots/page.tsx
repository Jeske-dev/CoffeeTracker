import { requireUser } from "@/lib/supabase/auth";
import { loadShotsPageData } from "@/features/data/queries";
import { CachedShotHistory } from "@/components/shots/cached-shot-history";

export default async function ShotsPage() {
  const { supabase, userId } = await requireUser();
  const { shots, beans } = await loadShotsPageData(userId, supabase);
  return <CachedShotHistory userId={userId} initialData={{ shots, beans }} />;
}
