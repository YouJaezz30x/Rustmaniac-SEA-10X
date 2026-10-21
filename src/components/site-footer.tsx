import { BRAND } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p>
          <strong>{BRAND.server}</strong> · {BRAND.region} · <code>client.connect {BRAND.address}</code>
        </p>
        <p>
          <a href={BRAND.discord} target="_blank" rel="noreferrer">
            Join Discord
          </a>
          <span aria-hidden="true"> · </span>
          <a href="/rules">Server rules</a>
        </p>
        <p className="muted">Not affiliated with or endorsed by Facepunch Studios.</p>
      </div>
    </footer>
  );
}
