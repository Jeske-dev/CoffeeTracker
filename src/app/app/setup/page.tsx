import { requireUser } from "@/lib/supabase/auth";
import { loadSetupData } from "@/features/data/queries";
import { SetupForm } from "@/components/setup/setup-form";

export default async function SetupPage() {
  const { supabase, userId, email } = await requireUser();
  const { profile, equipment, settings } = await loadSetupData(userId, supabase);
  return <SetupForm userId={userId} displayName={profile?.display_name || email.split("@")[0]} email={email} equipment={equipment} settings={settings} />;
}
