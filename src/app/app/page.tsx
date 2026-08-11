import { Suspense } from "react";
import { DashboardContent, DashboardSkeleton } from "@/components/dashboard/dashboard-content";
import { loadDashboardData } from "@/features/data/queries";
import { requireUser } from "@/lib/supabase/auth";

export default async function Dashboard() {
  const { supabase, userId, email } = await requireUser();
  const data = loadDashboardData(userId, supabase);

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent data={data} userId={userId} email={email} />
    </Suspense>
  );
}
