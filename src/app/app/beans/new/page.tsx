import { BeanForm } from "@/components/beans/bean-form";
import { requireUser } from "@/lib/supabase/auth";

export default async function NewBeanPage() {
  const { userId } = await requireUser();
  return <BeanForm userId={userId} />;
}
