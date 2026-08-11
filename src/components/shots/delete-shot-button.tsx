"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { deleteShot } from "@/features/data/actions";
import { usePrivateCache } from "@/hooks/use-private-cache";
import { privateCacheKeys } from "@/lib/cache/keys";
import type { ShotsPayload } from "@/lib/cache/types";
import { runOptimisticMutation } from "@/lib/cache/optimistic-mutation";

export function DeleteShotButton({ userId, id, beanId }: { userId: string; id: string; beanId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { mutate, invalidateShotData } = usePrivateCache();

  const remove = () => startTransition(async () => {
    const key = privateCacheKeys.shots(userId);
    try {
      const result = await runOptimisticMutation<ShotsPayload, Awaited<ReturnType<typeof deleteShot>>>({
        mutate: (data, options) => mutate<ShotsPayload>(key, data, options),
        optimisticData: (current) => current ? { ...current, shots: current.shots.filter((shot) => shot.id !== id) } : current,
        mutation: async () => { const result = await deleteShot(id); if (!result.ok) throw new Error(result.message); return result; },
      });
      await invalidateShotData({ userId, beanId, shotId: id, preserveShotList: true });
      toast.success(result.message);
      router.push("/app/shots");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Der Shot konnte nicht gelöscht werden.");
    }
  });

  return <AlertDialog><AlertDialogTrigger render={<Button variant="destructive" className="min-h-12"/>}><Trash2/>Shot löschen</AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Shot wirklich löschen?</AlertDialogTitle><AlertDialogDescription>Diese Extraktion wird dauerhaft entfernt. Das kann nicht rückgängig gemacht werden.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Abbrechen</AlertDialogCancel><AlertDialogAction disabled={pending} onClick={remove}>Endgültig löschen</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}
