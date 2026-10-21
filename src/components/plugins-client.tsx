"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatUsd } from "@/lib/pricing";
import { csrfFetch } from "@/lib/csrf-client";

type Plugin = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  version: string;
};

export function PluginsClient({ plugins }: { plugins: Plugin[] }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function addPlugin(plugin: Plugin) {
    setError(null);
    setMessage(null);
    if (!session) {
      router.push("/login");
      return;
    }
    setBusy(true);
    try {
      const res = await csrfFetch("/api/cart", {
        method: "POST",
        body: JSON.stringify({ kind: "plugin", pluginId: plugin.id, quantity: 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add plugin");
      setMessage(`${plugin.name} added — open the Store cart to checkout.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {message && <p className="alert alert--ok">{message}</p>}
      {error && <p className="alert alert--error">{error}</p>}
      <div className="plugin-grid">
        {plugins.map((plugin) => (
          <article key={plugin.id} className="plugin">
            <p className="package__tier">v{plugin.version}</p>
            <h3>{plugin.name}</h3>
            <p className="muted">{plugin.description}</p>
            <p className="price">{formatUsd(plugin.priceCents)}</p>
            <button
              className="btn btn--solid"
              type="button"
              disabled={busy}
              onClick={() => addPlugin(plugin)}
            >
              Add to cart
            </button>
          </article>
        ))}
      </div>
    </>
  );
}
