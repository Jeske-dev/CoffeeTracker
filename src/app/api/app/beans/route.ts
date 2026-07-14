import { NextResponse } from "next/server";
import { loadBeansPageData } from "@/features/data/queries";
import { getAuthContext } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ message: "Nicht angemeldet." }, { status: 401, headers: privateHeaders() });
  const { beans, lastBeanId, shotCounts, error } = await loadBeansPageData(auth.userId, auth.supabase);
  if (error) return NextResponse.json({ message: "Bohnen konnten nicht geladen werden." }, { status: 500, headers: privateHeaders() });
  return NextResponse.json({ beans, lastBeanId, shotCounts }, { headers: privateHeaders() });
}

function privateHeaders() {
  return { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" };
}
