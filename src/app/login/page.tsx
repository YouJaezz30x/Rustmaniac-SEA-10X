"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [steamMsg, setSteamMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setBusy(false);
    if (res?.error) {
      setError("Invalid email or password");
      return;
    }
    router.push("/account");
    router.refresh();
  }

  async function trySteam() {
    setSteamMsg(null);
    const res = await fetch("/api/auth/steam");
    const data = await res.json();
    setSteamMsg(data.message || "Steam login unavailable");
  }

  return (
    <div className="page">
      <h1 className="page__title">Sign in</h1>
      <p className="page__lead">
        Email/password auth with httpOnly session cookies. Steam OpenID is stubbed until{" "}
        <code>STEAM_API_KEY</code> is set.
      </p>
      <form className="form" onSubmit={onSubmit}>
        {error && <p className="alert alert--error">{error}</p>}
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        <button className="btn btn--solid" type="submit" disabled={busy}>
          Sign in
        </button>
      </form>
      <p className="muted" style={{ marginTop: "1rem" }}>
        No account? <Link href="/register">Register</Link>
      </p>
      <div style={{ marginTop: "1.5rem" }}>
        <button className="btn btn--ghost" type="button" onClick={trySteam}>
          Steam OpenID
        </button>
        {steamMsg && <p className="alert" style={{ marginTop: "0.75rem" }}>{steamMsg}</p>}
      </div>
    </div>
  );
}
