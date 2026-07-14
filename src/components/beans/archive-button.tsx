"use client";

import { useState, useTransition } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { archiveBean } from "@/features/data/actions";
import { usePrivateCache } from "@/hooks/use-private-cache";

export function ArchiveButton({ userId, id, archived }: { userId: string; id: string; archived: boolean }) {
  const [isArchived, setIsArchived] = useState(archived);
  const [pending, startTransition] = useTransition();
  const { invalidateBeanData } = usePrivateCache();

  return <Button variant="secondary" disabled={pending} className="rounded-full" onClick={() => startTransition(async () => {
    const next = !isArchived;
    setIsArchived(next);
    const result = await archiveBean(id, next);
    if (!result.ok) {
      setIsArchived(!next);
      toast.error(result.message);
      return;
    }
    await invalidateBeanData({ userId, beanId: id });
    toast.success(result.message);
  })}>{isArchived ? <ArchiveRestore /> : <Archive />}{isArchived ? "Wiederherstellen" : "Archivieren"}</Button>;
}
