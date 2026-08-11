import { requireUser } from "@/lib/supabase/auth";
import { loadBeansPageData } from "@/features/data/queries";
import { CachedBeansCollection } from "@/components/beans/cached-beans-collection";

export default async function BeansPage() {
  const { supabase, userId } = await requireUser();
  const { beans, lastBeanId, shotCounts } = await loadBeansPageData(userId, supabase);
  return <CachedBeansCollection userId={userId} initialData={{ beans, lastBeanId, shotCounts }} />;
}
