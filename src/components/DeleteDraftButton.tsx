"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiJson } from "@/lib/api-client";

export function DeleteDraftButton({ draftId }: { draftId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!window.confirm("Delete this saved draft? This cannot be undone.")) return;
    setBusy(true);
    setError(null);
    try {
      await apiJson(`/api/drafts/${draftId}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete draft");
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" disabled={busy} onClick={remove} className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50">
        {busy ? "Deleting…" : "Delete"}
      </button>
      {error ? <span className="ml-2 text-xs text-red-600">{error}</span> : null}
    </>
  );
}
