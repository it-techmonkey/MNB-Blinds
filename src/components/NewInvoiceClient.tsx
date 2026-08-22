"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiJson } from "@/lib/api-client";

type ClientRow = { id: string; code: string; name: string };
type ProductRow = { id: string; code: string; name: string; stock: number };
type PriceRow = { productId: string; price: string };

export function NewInvoiceClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [clientId, setClientId] = useState(searchParams.get("clientId") ?? "");
  const [clientPrices, setClientPrices] = useState<Map<string, string>>(new Map());
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!clientId) {
      setClientPrices(new Map());
      return;
    }
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

  function priceFor(productId: string): string {
    return prices[productId] ?? clientPrices.get(productId) ?? "";
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

  async function submit() {
    if (!clientId) {
      setError("Select a client.");
      return;
    }
    if (lines.length === 0) {
      setError("Enter a quantity for at least one product.");
      return;
    }
    if (lines.some((l) => isNaN(l.price) || l.price < 0)) {
      setError("Enter a valid price for every product with a quantity.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiJson<{ invoice: { id: string } }>("/api/invoices", {
        method: "POST",
        body: JSON.stringify({
          clientId,
          items: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity, price: l.price })),
        }),
      });
      router.push(`/invoices/${res.invoice.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invoice creation failed");
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
      {error ? <p className="alert-error">{error}</p> : null}

      <section className="card-dashboard p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-foreground">Client</h2>
        <p className="mt-1 text-xs text-muted-foreground">Prices prefill from this client&apos;s saved product prices, and remain editable per line.</p>
        <label className="field-label mt-3 text-xs" htmlFor="inv-client">
          Select client
        </label>
        <select id="inv-client" className="select-field mt-1.5 w-full max-w-lg" value={clientId} onChange={(e) => setClientId(e.target.value)}>
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
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 text-right font-medium">Stock</th>
                  <th className="px-4 py-3 text-right font-medium">Qty</th>
                  <th className="px-4 py-3 text-right font-medium">Price</th>
                  <th className="px-4 py-3 text-right font-medium">Line total</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
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
                          onChange={(e) => setQuantities((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        />
                      </td>
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

      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{lines.length}</span> line{lines.length === 1 ? "" : "s"} · Total{" "}
          <span className="font-semibold text-foreground">${total.toFixed(2)}</span>
        </p>
        <button type="button" disabled={submitting || lines.length === 0} className="btn-primary w-full sm:w-auto" onClick={submit}>
          {submitting ? "Creating…" : "Create invoice"}
        </button>
      </div>
    </div>
  );
}
