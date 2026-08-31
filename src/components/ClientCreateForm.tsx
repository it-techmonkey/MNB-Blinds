"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiJson } from "@/lib/api-client";

type Product = { id: string; code: string; name: string };
type SortKey = "code" | "name" | "price";

export function ClientCreateForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<SortKey>("name");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiJson<{ data: Product[] }>("/api/products?all=true&activeOnly=true")
      .then((result) => {
        if (!cancelled) setProducts(result.data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load products");
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function setProductPrice(productId: string, value: string) {
    setPrices((current) => ({ ...current, [productId]: value }));
  }

  const sortedProducts = useMemo(() => [...products].sort((a, b) => {
    const left = sort === "code" ? a.code : sort === "name" ? a.name : Number(prices[a.id] ?? -1);
    const right = sort === "code" ? b.code : sort === "name" ? b.name : Number(prices[b.id] ?? -1);
    const comparison = typeof left === "string" ? left.localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" }) : left - Number(right);
    return direction === "asc" ? comparison : -comparison;
  }), [products, prices, sort, direction]);

  function toggleSort(key: SortKey) {
    if (sort === key) setDirection((value) => value === "asc" ? "desc" : "asc");
    else { setSort(key); setDirection("asc"); }
  }

  function sortableHeader(key: SortKey, label: string) {
    return <button type="button" onClick={() => toggleSort(key)} className="inline-flex items-center gap-1 font-medium hover:text-foreground">{label}<span aria-hidden="true">{sort === key ? (direction === "asc" ? "↑" : "↓") : "↕"}</span></button>;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (productsLoading) {
      setError("Wait for the product price list to load.");
      return;
    }
    const priceRows = products
      .map((product) => ({ productId: product.id, rawPrice: prices[product.id]?.trim() ?? "" }))
      .filter((row) => row.rawPrice !== "");
    if (priceRows.some((row) => !Number.isFinite(Number(row.rawPrice)) || Number(row.rawPrice) < 0)) {
      setError("Enter a valid price for each product you choose to price.");
      return;
    }
    setLoading(true);
    try {
      const client = await apiJson<{ client: { id: string } }>("/api/clients", {
        method: "POST",
        body: JSON.stringify({
          code: code.trim(),
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          prices: priceRows.map((row) => ({ productId: row.productId, price: Number(row.rawPrice) })),
        }),
      });
      router.push(`/clients/${client.client.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card-dashboard space-y-5 p-5 sm:max-w-4xl sm:p-6">
      {error ? <p className="alert-error">{error}</p> : null}
      <div>
        <p className="section-kicker">Client identity</p>
        <p className="helper-text mt-2">Client code is permanent once saved — the name can be changed later.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="cc-code">
            Client code
          </label>
          <input id="cc-code" required className="input-field" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="cc-name">
            Client name
          </label>
          <input id="cc-name" required className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="cc-phone">
            Phone <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input id="cc-phone" className="input-field" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="cc-email">
            Email <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input id="cc-email" type="email" className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="field-label" htmlFor="cc-address">
          Address <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="cc-address"
          rows={2}
          className="input-field min-h-[4rem] resize-y py-2"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>
      <section className="overflow-hidden rounded-xl border border-border">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Product prices</h2>
          <p className="mt-1 text-xs text-muted-foreground">Optional: set prices only for products this client buys. You can add or change prices later.</p>
        </div>
        {productsLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }).map((_, index) => <div key={index} className="skeleton-bar h-10" />)}
          </div>
        ) : products.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No active products yet. You can add product prices later.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full min-w-125 text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="table-head">
                  <th className="px-4 py-3">{sortableHeader("code", "Code")}</th>
                  <th className="px-4 py-3">{sortableHeader("name", "Product")}</th>
                  <th className="px-4 py-3 text-right">{sortableHeader("price", "Price")}</th>
                </tr>
              </thead>
              <tbody>
                {sortedProducts.map((product) => (
                  <tr key={product.id} className="table-row">
                    <td className="px-4 py-3 text-muted-foreground">{product.code}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{product.name}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative ml-auto w-32">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="input-field-sm h-8 w-full pl-5 text-right text-xs"
                          value={prices[product.id] ?? ""}
                          onChange={(e) => setProductPrice(product.id, e.target.value)}
                          aria-label={`Price for ${product.name}`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={loading || productsLoading} className="btn-primary">
          {loading ? "Saving…" : "Create client"}
        </button>
        <button type="button" className="btn-ghost" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </form>
  );
}
