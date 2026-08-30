"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiJson } from "@/lib/api-client";

export function IssueCreditNoteButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function issueCreditNote() {
    setBusy(true);
    setError(null);
    try {
      await apiJson(`/api/invoices/${invoiceId}/credit-note`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not issue credit note");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="btn-secondary h-9 w-full px-3 text-xs" onClick={() => setOpen(true)}>
        Issue credit note
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setOpen(false);
          }}
        >
          <div className="card-dashboard my-8 w-full max-w-md space-y-5 p-6 shadow-[0_24px_64px_-12px_rgba(13,20,32,0.32)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground">Issue credit note</h2>
                <p className="mt-1 text-sm text-muted-foreground">This fully reverses the invoice and cannot be undone.</p>
              </div>
              <button type="button" disabled={busy} onClick={() => setOpen(false)} className="text-muted-foreground transition-colors hover:text-foreground" aria-label="Close">
                ✕
              </button>
            </div>
            <div>
              <label className="field-label" htmlFor="credit-note-reason">
                Reason <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <textarea
                id="credit-note-reason"
                rows={3}
                className="input-field resize-y"
                placeholder="e.g. Test invoice; no sale took place"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={busy}
              />
            </div>
            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              All invoice quantities will be returned to stock and the invoice will no longer count toward sales or money owed.
            </p>
            {error ? <p className="alert-error text-sm">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <button type="button" disabled={busy} onClick={() => setOpen(false)} className="btn-secondary h-9 px-4 text-sm">
                Cancel
              </button>
              <button type="button" disabled={busy} onClick={issueCreditNote} className="btn-primary h-9 px-4 text-sm">
                {busy ? "Issuing…" : "Issue credit note"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
