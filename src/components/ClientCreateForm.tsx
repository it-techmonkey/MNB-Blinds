"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiJson } from "@/lib/api-client";

export function ClientCreateForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
    <form onSubmit={onSubmit} className="card-dashboard space-y-5 p-5 sm:max-w-2xl sm:p-6">
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
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Saving…" : "Create client"}
        </button>
        <button type="button" className="btn-ghost" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </form>
  );
}
