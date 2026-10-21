"use client";

import { useCallback, useEffect, useState } from "react";
import { csrfFetch } from "@/lib/csrf-client";
import { formatMoney } from "@/lib/pricing";

const TABS = [
  "packages",
  "plugins",
  "staff",
  "rules",
  "announcements",
  "orders",
  "deliveries",
  "reviews",
] as const;

type Tab = (typeof TABS)[number];

export function AdminClient() {
  const [tab, setTab] = useState<Tab>("packages");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async (resource: Tab) => {
    setError(null);
    const res = await fetch(`/api/admin/${resource}`, { credentials: "include" });
    if (!res.ok) {
      setError("Failed to load");
      return;
    }
    setRows(await res.json());
  }, []);

  useEffect(() => {
    void load(tab);
  }, [tab, load]);

  async function createPackage(form: FormData) {
    setMessage(null);
    const payload = {
      slug: String(form.get("slug")),
      name: String(form.get("name")),
      tier: String(form.get("tier")),
      grantTier: String(form.get("grantTier")),
      description: String(form.get("description")),
      features: String(form.get("features") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      kitContents: String(form.get("kitContents") || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      priceMonth: Number(form.get("priceMonth")),
      priceThree: Number(form.get("priceThree")),
      pricePerm: Number(form.get("pricePerm")),
    };
    const res = await csrfFetch("/api/admin/packages", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setError("Create failed");
      return;
    }
    setMessage("Package created");
    await load("packages");
  }

  async function createPlugin(form: FormData) {
    const payload = {
      slug: String(form.get("slug")),
      name: String(form.get("name")),
      description: String(form.get("description")),
      priceCents: Number(form.get("priceCents")),
      version: String(form.get("version") || "1.0.0"),
    };
    const res = await csrfFetch("/api/admin/plugins", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setError("Create failed");
      return;
    }
    setMessage("Plugin created");
    await load("plugins");
  }

  async function createStaff(form: FormData) {
    const payload = {
      name: String(form.get("name")),
      role: String(form.get("role")),
      avatarUrl: String(form.get("avatarUrl") || ""),
    };
    const res = await csrfFetch("/api/admin/staff", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setError("Create failed");
      return;
    }
    setMessage("Staff added");
    await load("staff");
  }

  async function createRule(form: FormData) {
    const payload = {
      category: String(form.get("category")),
      title: String(form.get("title")),
      body: String(form.get("body")),
    };
    const res = await csrfFetch("/api/admin/rules", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setError("Create failed");
      return;
    }
    setMessage("Rule added");
    await load("rules");
  }

  async function createAnnouncement(form: FormData) {
    const payload = {
      title: String(form.get("title")),
      body: String(form.get("body")),
      pinned: form.get("pinned") === "on",
    };
    const res = await csrfFetch("/api/admin/announcements", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setError("Create failed");
      return;
    }
    setMessage("Announcement added");
    await load("announcements");
  }

  async function remove(id: string) {
    const res = await csrfFetch(`/api/admin/${tab}?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Delete failed");
      return;
    }
    setMessage("Deleted");
    await load(tab);
  }

  async function markFulfilled(id: string) {
    const res = await csrfFetch("/api/admin/orders", {
      method: "POST",
      body: JSON.stringify({ id, status: "FULFILLED" }),
    });
    if (!res.ok) {
      setError("Update failed");
      return;
    }
    setMessage("Order marked fulfilled");
    await load("orders");
  }

  async function retryDelivery(id: string) {
    const res = await csrfFetch("/api/admin/deliveries", {
      method: "POST",
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      setError("Retry failed");
      return;
    }
    setMessage("Delivery queued again — the server picks it up within 30 seconds");
    await load("deliveries");
  }

  async function approveReview(id: string, approved: boolean) {
    const res = await csrfFetch("/api/admin/reviews", {
      method: "POST",
      body: JSON.stringify({ id, approved }),
    });
    if (!res.ok) {
      setError("Update failed");
      return;
    }
    setMessage(approved ? "Review approved" : "Review hidden");
    await load("reviews");
  }

  return (
    <div>
      <div className="admin-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={tab === t ? "is-active" : undefined}
            onClick={() => {
              setMessage(null);
              setTab(t);
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {error && <p className="alert alert--error">{error}</p>}
      {message && <p className="alert alert--ok">{message}</p>}

      {tab === "packages" && (
        <form
          className="form"
          style={{ marginBottom: "1.5rem", maxWidth: 560 }}
          onSubmit={(e) => {
            e.preventDefault();
            void createPackage(new FormData(e.currentTarget));
            e.currentTarget.reset();
          }}
        >
          <h3>New VIP package</h3>
          <label>
            Slug
            <input name="slug" required />
          </label>
          <label>
            Name
            <input name="name" required />
          </label>
          <label>
            Tier
            <input name="tier" required />
          </label>
          <label>
            In-game rank given
            <select name="grantTier" defaultValue="vip">
              <option value="vip">VIP</option>
              <option value="vip+">VIP+</option>
              <option value="vip++">VIP++</option>
            </select>
          </label>
          <label>
            Description
            <textarea name="description" required />
          </label>
          <label>
            Features (comma-separated)
            <input name="features" />
          </label>
          <label>
            Kit contents (one line each)
            <textarea name="kitContents" />
          </label>
          <label>
            Price 1mo (cents)
            <input name="priceMonth" type="number" required />
          </label>
          <label>
            Price 3mo (cents)
            <input name="priceThree" type="number" required />
          </label>
          <label>
            Price permanent (cents)
            <input name="pricePerm" type="number" required />
          </label>
          <button className="btn btn--solid" type="submit">
            Create
          </button>
        </form>
      )}

      {tab === "plugins" && (
        <form
          className="form"
          style={{ marginBottom: "1.5rem" }}
          onSubmit={(e) => {
            e.preventDefault();
            void createPlugin(new FormData(e.currentTarget));
            e.currentTarget.reset();
          }}
        >
          <h3>New plugin</h3>
          <label>
            Slug
            <input name="slug" required />
          </label>
          <label>
            Name
            <input name="name" required />
          </label>
          <label>
            Description
            <textarea name="description" required />
          </label>
          <label>
            Price (cents)
            <input name="priceCents" type="number" required />
          </label>
          <label>
            Version
            <input name="version" defaultValue="1.0.0" />
          </label>
          <button className="btn btn--solid" type="submit">
            Create
          </button>
        </form>
      )}

      {tab === "staff" && (
        <form
          className="form"
          style={{ marginBottom: "1.5rem" }}
          onSubmit={(e) => {
            e.preventDefault();
            void createStaff(new FormData(e.currentTarget));
            e.currentTarget.reset();
          }}
        >
          <h3>Add staff</h3>
          <label>
            Name
            <input name="name" required />
          </label>
          <label>
            Role
            <input name="role" required />
          </label>
          <label>
            Avatar URL
            <input name="avatarUrl" />
          </label>
          <button className="btn btn--solid" type="submit">
            Create
          </button>
        </form>
      )}

      {tab === "rules" && (
        <form
          className="form"
          style={{ marginBottom: "1.5rem", maxWidth: 560 }}
          onSubmit={(e) => {
            e.preventDefault();
            void createRule(new FormData(e.currentTarget));
            e.currentTarget.reset();
          }}
        >
          <h3>Add rule</h3>
          <label>
            Category
            <input name="category" required />
          </label>
          <label>
            Title
            <input name="title" required />
          </label>
          <label>
            Body
            <textarea name="body" required />
          </label>
          <button className="btn btn--solid" type="submit">
            Create
          </button>
        </form>
      )}

      {tab === "announcements" && (
        <form
          className="form"
          style={{ marginBottom: "1.5rem", maxWidth: 560 }}
          onSubmit={(e) => {
            e.preventDefault();
            void createAnnouncement(new FormData(e.currentTarget));
            e.currentTarget.reset();
          }}
        >
          <h3>Add announcement</h3>
          <label>
            Title
            <input name="title" required />
          </label>
          <label>
            Body
            <textarea name="body" required />
          </label>
          <label>
            <span>Pinned</span>
            <input name="pinned" type="checkbox" />
          </label>
          <button className="btn btn--solid" type="submit">
            Create
          </button>
        </form>
      )}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Record</th>
            <th>Details</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const id = String(row.id);
            const order = row.order as { displayName?: string | null } | undefined;
            const title =
              tab === "deliveries"
                ? `${order?.displayName ?? "Player"} · ${row.steamId}`
                : tab === "orders"
                  ? String(row.displayName ?? row.steamId ?? row.email ?? id)
                  : String(row.name ?? row.title ?? row.email ?? row.author ?? id);
            const detail =
              tab === "orders"
                ? `${row.status} · ${formatMoney(Number(row.totalCents ?? 0), String(row.currency ?? "usd"))}`
                : tab === "deliveries"
                  ? `${row.status} · ${row.tier} · ${row.days ? `${row.days} days` : "permanent"}${row.result ? ` · ${row.result}` : ""}`
                : tab === "reviews"
                  ? `${row.approved ? "approved" : "pending"} · ${row.body}`
                  : tab === "packages"
                    ? `${row.tier} · ${row.slug}`
                    : tab === "plugins"
                      ? `v${row.version} · ${formatMoney(Number(row.priceCents ?? 0))}`
                      : String(row.role ?? row.category ?? row.body ?? "");
            return (
              <tr key={id}>
                <td>{title}</td>
                <td>{detail}</td>
                <td style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                  {tab === "orders" && row.status !== "FULFILLED" && (
                    <button
                      className="btn btn--ghost"
                      type="button"
                      onClick={() => markFulfilled(id)}
                    >
                      Mark fulfilled
                    </button>
                  )}
                  {tab === "reviews" && (
                    <>
                      <button
                        className="btn btn--ghost"
                        type="button"
                        onClick={() => approveReview(id, true)}
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn--ghost"
                        type="button"
                        onClick={() => approveReview(id, false)}
                      >
                        Hide
                      </button>
                    </>
                  )}
                  {tab === "deliveries" && row.status !== "DELIVERED" && (
                    <button className="btn btn--ghost" type="button" onClick={() => retryDelivery(id)}>
                      Retry
                    </button>
                  )}
                  {tab !== "orders" && tab !== "reviews" && tab !== "deliveries" && (
                    <button className="btn btn--ghost" type="button" onClick={() => remove(id)}>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
