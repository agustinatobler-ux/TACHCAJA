"use client";

import { useTransition } from "react";
import { syncMetaData } from "@/app/actions/meta";

export function SyncAdsButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(() => syncMetaData())}
      className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 disabled:opacity-50"
    >
      {isPending ? "Sincronizando…" : "Sincronizar ahora"}
    </button>
  );
}
