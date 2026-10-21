import { BRAND } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p>
          <strong>{BRAND.server}</strong> — community store &amp; Oxide marketplace.
        </p>
        <p>
          <a href={BRAND.discord} target="_blank" rel="noreferrer">
            Join Discord
          </a>
          <span aria-hidden="true"> · </span>
          <a href="/rules">Server rules</a>
        </p>
        <p className="muted">
          Live RCON status, Discord bot sync, and in-game auto-grant ship after v1.
        </p>
      </div>
    </footer>
  );
}
