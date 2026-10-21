"use client";

import { FormEvent, Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const steamFailed = useSearchParams().get("error") === "steam";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
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

  return (
    <div className="page">
      <h1 className="page__title">Sign in</h1>
      <p className="page__lead">
        Sign in with Steam to buy VIP. It goes straight to your Steam account in game.
      </p>
      {steamFailed && <p className="alert alert--error">Steam sign-in didn&apos;t complete. Please try again.</p>}
      <div style={{ marginBottom: "2rem" }}>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- redirects off-site to Steam */}
        <a className="btn btn--solid" href="/api/auth/steam?mode=login">
          Sign in through Steam
        </a>
      </div>
      <p className="muted">Or use the email account you registered:</p>
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
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
