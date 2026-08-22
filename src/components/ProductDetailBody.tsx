"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiJson } from "@/lib/api-client";

type Product = {
  id: string;
  code: string;
  name: string;
  currentCost: string;
  stock: number;
  isActive: boolean;
};

type Restock = {
  id: string;
  quantity: number;
  costPerUnit: string;
  purchasedAt: string;
  note: string | null;
};

function EditProductModal({ product, onClose, onDone }: { product: Product; onClose: () => void; onDone: () => void }) {
  const [code, setCode] = useState(product.code);
  const [name, setName] = useState(product.name);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!code.trim() || !name.trim()) {
      setError("Code and name can't be empty.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiJson(`/api/products/${product.id}`, {
        method: "PUT",
        body: JSON.stringify({ code: code.trim(), name: name.trim() }),
      });
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="card-dashboard my-8 w-full max-w-md space-y-5 p-6 shadow-[0_24px_64px_-12px_rgba(13,20,32,0.32)]">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground">Edit product</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground transition-colors hover:text-foreground" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="grid gap-4">
          <div>
            <label className="field-label" htmlFor="ep-code">
              Product code
            </label>
            <input id="ep-code" className="input-field" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="ep-name">
              Product name
            </label>
            <input id="ep-name" className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <p className="helper-text">Past invoices keep the code and name as they were at the time of sale.</p>
        </div>
        {error ? <p className="alert-error text-sm">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary h-9 px-4 text-sm">
            Cancel
          </button>
          <button type="button" disabled={busy} onClick={submit} className="btn-primary h-9 px-4 text-sm">
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RestockModal({ productId, onClose, onDone }: { productId: string; onClose: () => void; onDone: () => void }) {
  const [quantity, setQuantity] = useState("");
  const [costPerUnit, setCostPerUnit] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const q = Number(quantity);
    const c = Number(costPerUnit);
    if (!Number.isFinite(q) || q <= 0) {
      setError("Enter a quantity greater than zero.");
      return;
    }
    if (!Number.isFinite(c) || c < 0) {
      setError("Enter a valid cost per unit.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiJson(`/api/products/${productId}/restock`, {
        method: "POST",
        body: JSON.stringify({ quantity: q, costPerUnit: c, note: note.trim() || undefined }),
      });
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restock failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="card-dashboard my-8 w-full max-w-md space-y-5 p-6 shadow-[0_24px_64px_-12px_rgba(37,29,20,0.32)]">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground">Restock product</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground transition-colors hover:text-foreground" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="grid gap-4">
          <div>
            <label className="field-label" htmlFor="rs-qty">
              Quantity received
            </label>
            <input id="rs-qty" type="number" min="1" className="input-field" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="rs-cost">
              Cost per unit (this batch)
            </label>
            <input
              id="rs-cost"
              type="number"
              min="0"
              step="0.01"
              className="input-field"
              value={costPerUnit}
              onChange={(e) => setCostPerUnit(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="rs-note">
              Note <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <input id="rs-note" className="input-field" placeholder="e.g. supplier reference" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        {error ? <p className="alert-error text-sm">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary h-9 px-4 text-sm">
            Cancel
          </button>
          <button type="button" disabled={busy} onClick={submit} className="btn-primary h-9 px-4 text-sm">
            {busy ? "Saving…" : "Add batch"}
          </button>
        </div>
      </div>
    </div>
  );
}

function toDateInputValue(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function EditRestockModal({
  productId,
  restock,
  onClose,
  onDone,
}: {
  productId: string;
  restock: Restock;
  onClose: () => void;
  onDone: () => void;
}) {
  const [quantity, setQuantity] = useState(String(restock.quantity));
  const [costPerUnit, setCostPerUnit] = useState(restock.costPerUnit);
  const [purchasedAt, setPurchasedAt] = useState(toDateInputValue(restock.purchasedAt));
  const [note, setNote] = useState(restock.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const q = Number(quantity);
    const c = Number(costPerUnit);
    if (!Number.isFinite(q) || q <= 0) {
      setError("Enter a quantity greater than zero.");
      return;
    }
    if (!Number.isFinite(c) || c < 0) {
      setError("Enter a valid cost per unit.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiJson(`/api/products/${productId}/restock/${restock.id}`, {
        method: "PUT",
        body: JSON.stringify({
          quantity: q,
          costPerUnit: c,
          purchasedAt,
          note: note.trim() || null,
        }),
      });
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="card-dashboard my-8 w-full max-w-md space-y-5 p-6 shadow-[0_24px_64px_-12px_rgba(13,20,32,0.32)]">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground">Edit restock batch</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground transition-colors hover:text-foreground" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="grid gap-4">
          <div>
            <label className="field-label" htmlFor="er-qty">
              Quantity received
            </label>
            <input id="er-qty" type="number" min="1" className="input-field" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="er-cost">
              Cost per unit (this batch)
            </label>
            <input
              id="er-cost"
              type="number"
              min="0"
              step="0.01"
              className="input-field"
              value={costPerUnit}
              onChange={(e) => setCostPerUnit(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="er-date">
              Purchase date
            </label>
            <input id="er-date" type="date" className="input-field" value={purchasedAt} onChange={(e) => setPurchasedAt(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="er-note">
              Note <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <input id="er-note" className="input-field" placeholder="e.g. supplier reference" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <p className="helper-text">Changing quantity or cost updates the product&apos;s live stock and current cost.</p>
        </div>
        {error ? <p className="alert-error text-sm">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary h-9 px-4 text-sm">
            Cancel
          </button>
          <button type="button" disabled={busy} onClick={submit} className="btn-primary h-9 px-4 text-sm">
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProductDetailBody({
  product,
  restocks,
  autoOpenEdit = false,
}: {
  product: Product;
  restocks: Restock[];
  autoOpenEdit?: boolean;
}) {
  const router = useRouter();
  const [showRestock, setShowRestock] = useState(false);
  const [showEdit, setShowEdit] = useState(autoOpenEdit);
  const [editingRestock, setEditingRestock] = useState<Restock | null>(null);
  const [togglingActive, setTogglingActive] = useState(false);

  async function toggleActive() {
    setTogglingActive(true);
    try {
      await apiJson(`/api/products/${product.id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !product.isActive }),
      });
      router.refresh();
    } finally {
      setTogglingActive(false);
    }
  }

  return (
    <div className="content-stack">
      <section className="card-dashboard p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="section-kicker">{product.code}</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-foreground">{product.name}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`badge ${product.isActive ? "badge-paid" : "badge-neutral"}`}>{product.isActive ? "Active" : "Inactive"}</span>
            <button type="button" className="btn-secondary h-9 px-3 text-xs" onClick={() => setShowEdit(true)}>
              Edit product
            </button>
            <button type="button" disabled={togglingActive} className="btn-secondary h-9 px-3 text-xs" onClick={toggleActive}>
              {togglingActive ? "Saving…" : product.isActive ? "Deactivate" : "Activate"}
            </button>
            <button type="button" className="btn-primary h-9 px-3 text-xs" onClick={() => setShowRestock(true)}>
              Restock
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="stat-card">
            <p className="stat-label">Stock on hand</p>
            <p className="stat-value">{product.stock}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Current purchasing cost</p>
            <p className="stat-value">${product.currentCost}</p>
          </div>
        </div>
      </section>

      <section className="card-dashboard overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Restock history</h2>
          <span className="text-xs text-muted-foreground">Batch cost changes are logged here</span>
        </div>
        {restocks.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No restocks recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-150 text-sm">
              <thead>
                <tr className="table-head">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 text-right font-medium">Quantity</th>
                  <th className="px-4 py-3 text-right font-medium">Cost per unit</th>
                  <th className="px-4 py-3 font-medium">Note</th>
                  <th className="px-4 py-3 text-right font-medium">Edit</th>
                </tr>
              </thead>
              <tbody>
                {restocks.map((r) => (
                  <tr key={r.id} className="table-row">
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{new Date(r.purchasedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.quantity}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">${r.costPerUnit}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.note ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="text-xs font-semibold text-primary hover:underline"
                        onClick={() => setEditingRestock(r)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showEdit ? (
        <EditProductModal
          product={product}
          onClose={() => {
            setShowEdit(false);
            if (autoOpenEdit) router.replace(`/products/${product.id}`);
          }}
          onDone={() => router.refresh()}
        />
      ) : null}

      {showRestock ? (
        <RestockModal productId={product.id} onClose={() => setShowRestock(false)} onDone={() => router.refresh()} />
      ) : null}

      {editingRestock ? (
        <EditRestockModal
          productId={product.id}
          restock={editingRestock}
          onClose={() => setEditingRestock(null)}
          onDone={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}
