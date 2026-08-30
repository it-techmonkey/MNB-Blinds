"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiJson } from "@/lib/api-client";

export function ProductCreateForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [unitDetail, setUnitDetail] = useState("");
  const [openingStock, setOpeningStock] = useState("0");
  const [openingCost, setOpeningCost] = useState("0");
  const [purchaseCostNote, setPurchaseCostNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiJson("/api/products", {
        method: "POST",
        body: JSON.stringify({
          code: code.trim(),
          name: name.trim(),
          unit: unit.trim(),
          unitDetail: unitDetail.trim() || undefined,
          openingStock: Number(openingStock) || 0,
          openingCost: Number(openingCost) || 0,
          purchaseCostNote: purchaseCostNote.trim() || undefined,
        }),
      });
      router.push("/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card-dashboard space-y-5 p-5 sm:max-w-2xl sm:p-6">
      {error ? <p className="alert-error">{error}</p> : null}
      <div>
        <p className="section-kicker">Product identity</p>
        <p className="helper-text mt-2">Code must be unique. Both can be changed later from the product&apos;s detail page.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="pc-code">
            Product code
          </label>
          <input id="pc-code" required className="input-field" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="pc-name">
            Product name
          </label>
          <input id="pc-name" required className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="pc-unit">
            Unit
          </label>
          <input
            id="pc-unit"
            required
            className="input-field"
            placeholder="e.g. piece, box, metre"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="pc-unit-detail">
            Detail of unit <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            id="pc-unit-detail"
            className="input-field"
            placeholder="e.g. box of 100"
            value={unitDetail}
            onChange={(e) => setUnitDetail(e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="pc-stock">
            Opening stock in unit
          </label>
          <input
            id="pc-stock"
            type="number"
            min="0"
            className="input-field"
            value={openingStock}
            onChange={(e) => setOpeningStock(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="pc-cost">
            Purchasing cost per unit
          </label>
          <input
            id="pc-cost"
            type="number"
            min="0"
            step="0.01"
            className="input-field"
            value={openingCost}
            onChange={(e) => setOpeningCost(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="field-label" htmlFor="pc-cost-note">
          Purchase cost note <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="pc-cost-note"
          rows={3}
          className="input-field resize-y"
          placeholder="e.g. Exchange rate 1 USD = …; shipping rate …"
          value={purchaseCostNote}
          onChange={(e) => setPurchaseCostNote(e.target.value)}
        />
        <p className="helper-text mt-2">When opening stock is entered, this note is saved with its purchase batch.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Saving…" : "Create product"}
        </button>
        <button type="button" className="btn-ghost" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </form>
  );
}
