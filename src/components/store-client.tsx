"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DURATION_LABELS, type DurationKey } from "@/lib/brand";
import { formatMoney } from "@/lib/pricing";
import { csrfFetch } from "@/lib/csrf-client";

type VipPackage = {
  id: string;
  name: string;
  tier: string;
  description: string;
  features: string;
  kitContents: string;
  priceMonth: number;
  priceThree: number;
  pricePerm: number;
};

function priceFor(pkg: VipPackage, duration: DurationKey) {
  if (duration === "ONE_MONTH") return pkg.priceMonth;
  if (duration === "THREE_MONTHS") return pkg.priceThree;
  return pkg.pricePerm;
}

export function StoreClient({ packages }: { packages: VipPackage[] }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [duration, setDuration] = useState<Record<string, DurationKey>>(
    Object.fromEntries(packages.map((p) => [p.id, "ONE_MONTH" as DurationKey]))
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsSteam, setNeedsSteam] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cart, setCart] = useState<{
    items: { id: string; name: string; lineCents: number; duration?: string | null }[];
    totalCents: number;
  } | null>(null);

  const durations = useMemo(
    () => Object.keys(DURATION_LABELS) as DurationKey[],
    []
  );

  async function refreshCart() {
    const res = await fetch("/api/cart", { credentials: "include" });
    if (res.ok) setCart(await res.json());
  }

  async function addVip(pkg: VipPackage) {
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
        body: JSON.stringify({
          kind: "vip",
          vipPackageId: pkg.id,
          duration: duration[pkg.id],
          quantity: 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add to cart");
      setMessage(`${pkg.name} added to cart`);
      await refreshCart();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function checkout() {
    setError(null);
    setBusy(true);
    try {
      const res = await csrfFetch("/api/checkout", { method: "POST", body: "{}" });
      const data = await res.json();
      setNeedsSteam(Boolean(data.needsSteam));
      if (!res.ok) throw new Error(data.error || data.hint || "Checkout failed");
      if (data.url) window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(id: string) {
    await csrfFetch(`/api/cart?id=${id}`, { method: "DELETE" });
    await refreshCart();
  }

  return (
    <>
      {message && <p className="alert alert--ok">{message}</p>}
      {error && (
        <p className="alert alert--error">
          {error}{" "}
          {needsSteam && (
            // eslint-disable-next-line @next/next/no-html-link-for-pages -- redirects off-site to Steam
            <a href="/api/auth/steam?mode=link">Link Steam now</a>
          )}
        </p>
      )}

      <div className="package-grid">
        {packages.map((pkg) => {
          const selected = duration[pkg.id] ?? "ONE_MONTH";
          const features = JSON.parse(pkg.features) as string[];
          const kit = JSON.parse(pkg.kitContents || "[]") as string[];
          return (
            <article key={pkg.id} className="package">
              <p className="package__tier">{pkg.tier}</p>
              <h3>{pkg.name}</h3>
              <p className="muted">{pkg.description}</p>
              <ul className="feature-list">
                {features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {kit.length > 0 && (
                <details className="kit-details">
                  <summary>Everything in the {pkg.name} kit</summary>
                  <ul>
                    {kit.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </details>
              )}
              <div className="duration-row">
                {durations.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={selected === d ? "is-selected" : undefined}
                    onClick={() => setDuration((prev) => ({ ...prev, [pkg.id]: d }))}
                  >
                    {DURATION_LABELS[d]}
                  </button>
                ))}
              </div>
              <p className="price">{formatMoney(priceFor(pkg, selected))}</p>
              <button
                className="btn btn--solid"
                type="button"
                disabled={busy}
                onClick={() => addVip(pkg)}
              >
                Add to cart
              </button>
            </article>
          );
        })}
      </div>

      <div className="cart-panel">
        <div className="section-head">
          <h2>Cart</h2>
          <p className="muted">
            Sign in with Steam, then pay by card. Your rank is given in game automatically within a minute or two.
          </p>
        </div>
        {!session && (
          <p className="alert">
            <a href="/login">Sign in</a> to manage your cart.
          </p>
        )}
        {session && (
          <>
            <button className="btn btn--ghost" type="button" onClick={refreshCart}>
              Refresh cart
            </button>
            {cart && cart.items.length > 0 ? (
              <>
                <ul>
                  {cart.items.map((item) => (
                    <li key={item.id}>
                      <span>
                        {item.name}
                        {item.duration
                          ? ` · ${DURATION_LABELS[item.duration as DurationKey] ?? item.duration}`
                          : ""}
                      </span>
                      <span>
                        {formatMoney(item.lineCents)}{" "}
                        <button
                          className="btn btn--ghost"
                          type="button"
                          onClick={() => removeItem(item.id)}
                        >
                          Remove
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="price">Total {formatMoney(cart.totalCents)}</p>
                <button className="btn btn--solid" type="button" disabled={busy} onClick={checkout}>
                  Checkout
                </button>
              </>
            ) : (
              <p className="muted">Cart is empty.</p>
            )}
          </>
        )}
      </div>
    </>
  );
}
