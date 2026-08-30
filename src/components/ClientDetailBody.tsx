"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiJson } from "@/lib/api-client";

type Client = {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  paymentStatus: string;
  totalAmount: string;
  createdAt: string;
  creditNote: { creditNoteNumber: string } | null;
};

type Product = { id: string; code: string; name: string; isActive: boolean };
type PriceRow = { productId: string; price: string };

function EditClientModal({ client, onClose, onDone }: { client: Client; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(client.name);
  const [phone, setPhone] = useState(client.phone ?? "");
  const [email, setEmail] = useState(client.email ?? "");
  const [address, setAddress] = useState(client.address ?? "");
  const [isActive, setIsActive] = useState(client.isActive);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await apiJson(`/api/clients/${client.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          address: address.trim() || null,
          isActive,
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
      <div className="card-dashboard my-8 w-full max-w-lg space-y-5 p-6 shadow-[0_24px_64px_-12px_rgba(37,29,20,0.32)]">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground">Edit client — {client.code}</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground transition-colors hover:text-foreground" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="grid gap-4">
          <div>
            <label className="field-label" htmlFor="ec-name">
              Name
            </label>
            <input id="ec-name" className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="ec-phone">
                Phone
              </label>
              <input id="ec-phone" className="input-field" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="ec-email">
                Email
              </label>
              <input id="ec-email" type="email" className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="ec-address">
              Address
            </label>
            <textarea
              id="ec-address"
              rows={2}
              className="input-field min-h-[4rem] resize-y py-2"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-border accent-primary" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active client
          </label>
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

function ProductPricesSection({ clientId }: { clientId: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [prices, setPrices] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showPercentageAdjustment, setShowPercentageAdjustment] = useState(false);
  const [percentage, setPercentage] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [productsRes, pricesRes] = await Promise.all([
          apiJson<{ data: Product[] }>("/api/products?all=true"),
          apiJson<{ prices: PriceRow[] }>(`/api/clients/${clientId}/prices`),
        ]);
        if (cancelled) return;
        setProducts(productsRes.data);
        setPrices(new Map(pricesRes.prices.map((p) => [p.productId, p.price])));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  function setPrice(productId: string, value: string) {
    setSaved(false);
    setPrices((prev) => {
      const next = new Map(prev);
      if (value.trim() === "") next.delete(productId);
      else next.set(productId, value);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = Array.from(prices.entries())
        .map(([productId, price]) => ({ productId, price: parseFloat(price) }))
        .filter((p) => !isNaN(p.price) && p.price >= 0);
      await apiJson(`/api/clients/${clientId}/prices`, {
        method: "PUT",
        body: JSON.stringify({ prices: payload }),
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function applyPercentageAdjustment() {
    const parsedPercentage = Number(percentage);
    if (!Number.isFinite(parsedPercentage) || parsedPercentage <= -100 || parsedPercentage > 1_000) {
      setError("Enter a percentage greater than -100 and no more than 1,000.");
      return;
    }
    setAdjusting(true);
    setError(null);
    try {
      const result = await apiJson<{ prices: PriceRow[] }>(`/api/clients/${clientId}/prices`, {
        method: "POST",
        body: JSON.stringify({ percentage: parsedPercentage }),
      });
      setPrices(new Map(result.prices.map((price) => [price.productId, price.price])));
      setSaved(true);
      setShowPercentageAdjustment(false);
      setPercentage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Price adjustment failed");
    } finally {
      setAdjusting(false);
    }
  }

  return (
    <section className="card-dashboard overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Product prices</h2>
          <p className="text-xs text-muted-foreground">This client&apos;s current price per product — used to prefill invoices and adjust annually.</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" disabled={saving || adjusting || loading} className="btn-secondary h-9 px-3 text-xs" onClick={() => setShowPercentageAdjustment(true)}>
            Annual % change
          </button>
          <button type="button" disabled={saving || adjusting} className="btn-secondary h-9 px-3 text-xs" onClick={save}>
            {saving ? "Saving…" : saved ? "Saved" : "Save prices"}
          </button>
        </div>
      </div>
      {error ? <p className="px-4 py-3 text-sm text-destructive">{error}</p> : null}
      {loading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton-bar h-10" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">No products yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-125 text-sm">
            <thead>
              <tr className="table-head">
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="table-row">
                  <td className="px-4 py-3 text-muted-foreground">{p.code}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="relative ml-auto w-32">
                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="—"
                        value={prices.get(p.id) ?? ""}
                        onChange={(e) => setPrice(p.id, e.target.value)}
                        className="input-field-sm h-8 w-full pl-5 text-right text-xs"
                        aria-label={`Price for ${p.name}`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showPercentageAdjustment ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !adjusting) setShowPercentageAdjustment(false);
          }}
        >
          <div className="card-dashboard my-8 w-full max-w-md space-y-5 p-6 shadow-[0_24px_64px_-12px_rgba(13,20,32,0.32)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground">Annual price change</h2>
                <p className="mt-1 text-sm text-muted-foreground">Apply the same percentage change to every saved product price for this client.</p>
              </div>
              <button type="button" disabled={adjusting} onClick={() => setShowPercentageAdjustment(false)} className="text-muted-foreground transition-colors hover:text-foreground" aria-label="Close">✕</button>
            </div>
            <div>
              <label className="field-label" htmlFor="client-price-percentage">Percentage change</label>
              <div className="relative">
                <input
                  id="client-price-percentage"
                  type="number"
                  min="-99.99"
                  max="1000"
                  step="0.01"
                  className="input-field pr-8"
                  placeholder="e.g. 5 or -2.5"
                  value={percentage}
                  onChange={(e) => setPercentage(e.target.value)}
                  disabled={adjusting}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
              </div>
              <p className="helper-text mt-2">Use a positive number to increase prices and a negative number to reduce them.</p>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" disabled={adjusting} onClick={() => setShowPercentageAdjustment(false)} className="btn-secondary h-9 px-4 text-sm">Cancel</button>
              <button type="button" disabled={adjusting} onClick={applyPercentageAdjustment} className="btn-primary h-9 px-4 text-sm">{adjusting ? "Applying…" : "Apply change"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function InvoiceHistorySection({ invoices }: { invoices: Invoice[] }) {
  return (
    <section className="card-dashboard overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Invoice history</h2>
        <span className="text-xs text-muted-foreground">Ordered by purchase date</span>
      </div>
      {invoices.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">No invoices for this client yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-125 text-sm">
            <thead>
              <tr className="table-head">
                <th className="px-4 py-3 font-medium">Invoice</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="table-row">
                  <td className="px-4 py-3 font-semibold text-foreground">
                    <Link href={`/invoices/${inv.id}`} className="hover:underline">
                      {inv.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${inv.creditNote ? "badge-neutral" : inv.paymentStatus === "PAID" ? "badge-paid" : "badge-unpaid"}`}>
                      {inv.creditNote ? "Credited" : inv.paymentStatus === "PAID" ? "Paid" : "Unpaid"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">${inv.totalAmount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function ClientDetailBody({ client, invoices, autoOpenEdit = false }: { client: Client; invoices: Invoice[]; autoOpenEdit?: boolean }) {
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(autoOpenEdit);

  return (
    <div className="content-stack">
      <section className="card-dashboard p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="section-kicker">{client.code}</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-foreground">{client.name}</h2>
            <div className="mt-2 space-y-0.5 text-sm text-muted-foreground">
              {client.phone ? <p>{client.phone}</p> : null}
              {client.email ? <p>{client.email}</p> : null}
              {client.address ? <p className="whitespace-pre-line">{client.address}</p> : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`badge ${client.isActive ? "badge-paid" : "badge-neutral"}`}>{client.isActive ? "Active" : "Inactive"}</span>
            <button type="button" className="btn-secondary h-9 px-3 text-xs" onClick={() => setShowEdit(true)}>
              Edit client
            </button>
            <Link href={`/invoices/new?clientId=${client.id}`} className="btn-primary h-9 px-3 text-xs">
              New invoice
            </Link>
          </div>
        </div>
      </section>

      <ProductPricesSection clientId={client.id} />
      <InvoiceHistorySection invoices={invoices} />

      {showEdit ? (
        <EditClientModal
          client={client}
          onClose={() => {
            setShowEdit(false);
            if (autoOpenEdit) router.replace(`/clients/${client.id}`);
          }}
          onDone={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}
