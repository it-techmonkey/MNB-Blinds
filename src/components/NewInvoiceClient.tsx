"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiJson } from "@/lib/api-client";

type ClientRow = { id: string; code: string; name: string };
type ProductRow = { id: string; code: string; name: string; stock: number; unit: string | null; unitDetail: string | null };
type PriceRow = { productId: string; price: string };
type DraftRow = {
  id: string;
  clientId: string;
  items: { productId: string; productName: string; quantity: number; price: string }[];
};
type SortKey = "code" | "name" | "price";
type FormError = { message: string; details?: string[] };
type SummaryLine = { product: ProductRow; quantity: number; price: number };

const money = (n: number) => `$${(isNaN(n) ? 0 : n).toFixed(2)}`;

function OrderSummary({ lines, total }: { lines: SummaryLine[]; total: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="max-h-72 overflow-auto">
        <table className="w-full min-w-120 text-sm">
          <thead className="sticky top-0 bg-muted">
            <tr className="text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">Code</th>
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="px-3 py-2 text-right font-medium">Qty</th>
              <th className="px-3 py-2 text-right font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const short = l.quantity > l.product.stock;
              return (
                <tr key={l.product.id} className="border-t border-border">
                  <td className="px-3 py-2 text-muted-foreground">{l.product.code}</td>
                  <td className="px-3 py-2 font-medium text-foreground">{l.product.name}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${short ? "font-semibold text-red-600" : ""}`}>
                    {l.quantity}
                    {short ? <span className="block text-xs font-normal">only {l.product.stock} in stock</span> : null}
                  </td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">{money(l.quantity * l.price)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-border bg-muted px-3 py-2 text-sm">
        <span className="text-muted-foreground">
          <span className="font-semibold text-foreground">{lines.length}</span> line{lines.length === 1 ? "" : "s"}
        </span>
        <span className="text-muted-foreground">
          Total <span className="font-semibold text-foreground">{money(total)}</span>
        </span>
      </div>
    </div>
  );
}

export function NewInvoiceClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [clientId, setClientId] = useState(searchParams.get("clientId") ?? "");
  const [clientPrices, setClientPrices] = useState<Map<string, string>>(new Map());
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<SortKey>("name");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<FormError | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [draftNotices, setDraftNotices] = useState<string[]>([]);
  const draftId = searchParams.get("draftId");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cRes, pRes] = await Promise.all([
          apiJson<{ data: ClientRow[] }>("/api/clients?all=true&activeOnly=true"),
          apiJson<{ data: ProductRow[] }>("/api/products?all=true&activeOnly=true"),
        ]);
        if (cancelled) return;
        setClients(cRes.data);
        setProducts(pRes.data);

        if (draftId) {
          const { draft } = await apiJson<{ draft: DraftRow }>(`/api/drafts/${draftId}`);
          const { prices: current } = await apiJson<{ prices: PriceRow[] }>(`/api/clients/${draft.clientId}/prices`);
          if (cancelled) return;
          const currentByProduct = new Map(current.map((p) => [p.productId, p.price]));
          const productById = new Map(pRes.data.map((p) => [p.id, p]));
          const notices: string[] = [];
          const nextQuantities: Record<string, string> = {};
          const nextPrices: Record<string, string> = {};
          for (const item of draft.items) {
            const product = productById.get(item.productId);
            if (!product) {
              notices.push(`${item.productName} is no longer available and was removed.`);
              continue;
            }
            if (item.quantity > product.stock) {
              notices.push(`${product.name}: only ${product.stock} in stock (draft had ${item.quantity}).`);
            }
            nextQuantities[item.productId] = String(item.quantity);
            const now = currentByProduct.get(item.productId);
            if (now === undefined) nextPrices[item.productId] = item.price;
            else if (Number(now) !== Number(item.price)) {
              notices.push(`${product.name}: price changed from $${Number(item.price).toFixed(2)} to $${Number(now).toFixed(2)}.`);
            }
          }
          setClientId(draft.clientId);
          setQuantities(nextQuantities);
          setPrices(nextPrices);
          setDraftNotices(notices);
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [draftId]);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [error]);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiJson<{ prices: PriceRow[] }>(`/api/clients/${clientId}/prices`);
        if (cancelled) return;
        const map = new Map(res.prices.map((p) => [p.productId, p.price]));
        setClientPrices(map);
        setPrices((prev) => {
          const next = { ...prev };
          for (const [productId, price] of map) {
            if (!next[productId]) next[productId] = price;
          }
          return next;
        });
      } catch {
        if (!cancelled) setClientPrices(new Map());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  function selectClient(nextClientId: string) {
    setClientId(nextClientId);
    if (!nextClientId) setClientPrices(new Map());
  }

  const priceFor = useCallback((productId: string): string => prices[productId] ?? clientPrices.get(productId) ?? "", [prices, clientPrices]);

  const sortedProducts = useMemo(() => [...products].sort((a, b) => {
    const left = sort === "code" ? a.code : sort === "name" ? a.name : Number(priceFor(a.id) || -1);
    const right = sort === "code" ? b.code : sort === "name" ? b.name : Number(priceFor(b.id) || -1);
    const comparison = typeof left === "string" ? left.localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" }) : left - Number(right);
    return direction === "asc" ? comparison : -comparison;
  }), [products, priceFor, sort, direction]);

  function toggleSort(key: SortKey) {
    if (sort === key) setDirection((value) => value === "asc" ? "desc" : "asc");
    else { setSort(key); setDirection("asc"); }
  }

  function sortableHeader(key: SortKey, label: string) {
    return <button type="button" onClick={() => toggleSort(key)} className="inline-flex items-center gap-1 font-medium hover:text-foreground">{label}<span aria-hidden="true">{sort === key ? (direction === "asc" ? "↑" : "↓") : "↕"}</span></button>;
  }

  const lines = useMemo(() => {
    return products
      .map((p) => ({
        product: p,
        quantity: Number(quantities[p.id] ?? 0),
        price: parseFloat(prices[p.id] ?? clientPrices.get(p.id) ?? ""),
      }))
      .filter((l) => l.quantity > 0);
  }, [products, quantities, prices, clientPrices]);

  function validate(prefix = ""): boolean {
    if (!clientId) {
      setError({ message: `${prefix}Select a client.` });
      return false;
    }
    if (lines.length === 0) {
      setError({ message: `${prefix}Enter a quantity for at least one product.` });
      return false;
    }
    if (lines.some((l) => isNaN(l.price) || l.price < 0)) {
      setError({ message: `${prefix}Enter a valid price for every product with a quantity.` });
      return false;
    }
    setError(null);
    return true;
  }

  function startCreate() {
    if (!validate("Invoice could not be created. ")) return;
    const short = lines.filter((l) => l.quantity > l.product.stock);
    if (short.length > 0) {
      setError({
        message: "Invoice could not be created. Not enough stock for:",
        details: short.map((l) => `${l.product.code} · ${l.product.name} — requested ${l.quantity}, only ${l.product.stock} in stock`),
      });
      return;
    }
    setConfirming(true);
  }

  const payloadItems = () => lines.map((l) => ({ productId: l.product.id, quantity: l.quantity, price: l.price }));

  async function saveForLater() {
    if (!validate()) return;
    setSaving(true);
    try {
      await apiJson(draftId ? `/api/drafts/${draftId}` : "/api/drafts", {
        method: draftId ? "PUT" : "POST",
        body: JSON.stringify({ clientId, items: payloadItems() }),
      });
      router.push("/invoices/drafts");
      router.refresh();
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : "Could not save draft" });
      setSaving(false);
    }
  }

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiJson<{ invoice: { id: string } }>("/api/invoices", {
        method: "POST",
        body: JSON.stringify({ clientId, items: payloadItems(), draftId: draftId ?? undefined }),
      });
      router.push(`/invoices/${res.invoice.id}`);
      router.refresh();
    } catch (e) {
      setConfirming(false);
      setError({
        message: `Invoice could not be created. ${e instanceof Error ? e.message : "Please try again."}`,
        details: ["No invoice was generated and no stock was deducted."],
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="table-shell p-4 sm:p-5">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-bar" />
          ))}
        </div>
      </div>
    );
  }

  const total = lines.reduce((sum, l) => sum + l.quantity * l.price, 0);

  return (
    <div className="content-stack">
      {loadError ? <p className="alert-error">{loadError}</p> : null}
      {draftNotices.length > 0 ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">This saved draft was updated to today&apos;s prices and stock:</p>
          <ul className="mt-1 list-disc pl-5">
            {draftNotices.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <section className="card-dashboard p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-foreground">Client</h2>
        <p className="mt-1 text-xs text-muted-foreground">Prices prefill from this client&apos;s saved product prices, and remain editable per line.</p>
        <label className="field-label mt-3 text-xs" htmlFor="inv-client">
          Select client
        </label>
        <select id="inv-client" className="select-field mt-1.5 w-full max-w-lg" value={clientId} onChange={(e) => selectClient(e.target.value)}>
          <option value="">— Choose —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.code})
            </option>
          ))}
        </select>
      </section>

      <section className="card-dashboard overflow-hidden p-0">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Products</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Enter a quantity for each product to sell.</p>
        </div>
        {products.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No active products.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-175 text-sm">
              <thead>
                <tr className="table-head">
                  <th className="px-4 py-3">{sortableHeader("code", "Code")}</th>
                  <th className="px-4 py-3">{sortableHeader("name", "Product")}</th>
                  <th className="px-4 py-3 text-right font-medium">Stock</th>
                  <th className="px-4 py-3 text-right font-medium">Qty</th>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 text-right">{sortableHeader("price", "Price per unit")}</th>
                  <th className="px-4 py-3 text-right font-medium">Line total</th>
                </tr>
              </thead>
              <tbody>
                {sortedProducts.map((p) => {
                  const qty = Number(quantities[p.id] ?? 0);
                  const price = parseFloat(priceFor(p.id));
                  const lineTotal = qty > 0 && !isNaN(price) ? qty * price : 0;
                  return (
                    <tr key={p.id} className="table-row">
                      <td className="px-4 py-3 text-muted-foreground">{p.code}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{p.stock}</td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          min={0}
                          max={p.stock}
                          className="input-field-sm ml-auto h-9 w-20 text-right"
                          value={quantities[p.id] ?? ""}
                          onChange={(e) => {
                            setQuantities((prev) => ({ ...prev, [p.id]: e.target.value }));
                            setError(null);
                          }}
                        />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{[p.unit, p.unitDetail].filter(Boolean).join(" · ") || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="relative ml-auto w-28">
                          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            className="input-field-sm h-9 w-full pl-5 text-right"
                            value={priceFor(p.id)}
                            onChange={(e) => setPrices((prev) => ({ ...prev, [p.id]: e.target.value }))}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">{lineTotal > 0 ? `$${lineTotal.toFixed(2)}` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card-dashboard space-y-3 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-foreground">Invoice summary</h2>
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">No products selected yet. Enter a quantity above to add products.</p>
        ) : (
          <OrderSummary lines={lines} total={total} />
        )}
      </section>

      <div className="space-y-3 border-t border-border pt-4">
        {error ? (
          <div ref={errorRef} role="alert" className="alert-error">
            <p className="font-semibold">{error.message}</p>
            {error.details?.length ? (
              <ul className="mt-1 list-disc pl-5">
                {error.details.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:justify-end">
          <button type="button" disabled={saving || submitting || lines.length === 0} className="btn-secondary w-full sm:w-auto" onClick={saveForLater}>
            {saving ? "Saving…" : "Save for later"}
          </button>
          <button type="button" disabled={saving || submitting || lines.length === 0} className="btn-primary w-full sm:w-auto" onClick={startCreate}>
            Create invoice
          </button>
        </div>
      </div>

      {confirming ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setConfirming(false);
          }}
        >
          <div className="card-dashboard my-8 w-full max-w-2xl space-y-5 p-6 shadow-[0_24px_64px_-12px_rgba(13,20,32,0.32)]">
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground">Are you sure you want to place this order?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {lines.length} line{lines.length === 1 ? "" : "s"} · Total {money(total)}
              </p>
            </div>
            <OrderSummary lines={lines} total={total} />
            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              Stock will be deducted now. An invoice can&apos;t be deleted once created, only reversed with a credit note. If the client isn&apos;t ready, use Save for later instead.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" disabled={submitting} onClick={() => setConfirming(false)} className="btn-secondary h-9 px-4 text-sm">
                Cancel
              </button>
              <button type="button" disabled={submitting} onClick={submit} className="btn-primary h-9 px-4 text-sm">
                {submitting ? "Creating…" : "Yes, create invoice"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
