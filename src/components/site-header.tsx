"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { BRAND } from "@/lib/brand";

const links = [
  { href: "/", label: "Home" },
  { href: "/rules", label: "Rules" },
  { href: "/store", label: "Store" },
  { href: "/plugins", label: "Plugins" },
  { href: "/reviews", label: "Reviews" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="brand-mark">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.logo} alt="" width={40} height={40} />
          <span>{BRAND.name}</span>
        </Link>
        <nav className="site-nav" aria-label="Primary">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname === link.href ? "is-active" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="site-header__actions">
          <a className="btn btn--ghost" href={BRAND.discord} target="_blank" rel="noreferrer">
            Discord
          </a>
          {session?.user ? (
            <>
              <Link className="btn btn--ghost" href="/account">
                Account
              </Link>
              {session.user.role === "ADMIN" && (
                <Link className="btn btn--ghost" href="/admin">
                  Admin
                </Link>
              )}
              <button className="btn btn--solid" type="button" onClick={() => signOut()}>
                Sign out
              </button>
            </>
          ) : (
            <Link className="btn btn--solid" href="/login">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
