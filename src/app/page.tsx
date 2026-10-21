import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BRAND } from "@/lib/brand";
import { RecentPurchases } from "@/components/recent-purchases";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [staff, announcements] = await Promise.all([
    prisma.staff.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.announcement.findMany({
      where: { active: true },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 3,
    }),
  ]);

  return (
    <>
      <section className="hero" aria-label="Rustmaniac SEA 10X">
        <div className="hero__media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.bannerFull} alt="" />
        </div>
        <div className="hero__shade" />
        <div className="hero__content">
          <div className="hero__brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND.logo} alt="" width={72} height={72} />
            <h1 className="hero__brand-text">
              {BRAND.name}
              <span>SEA 10X</span>
            </h1>
          </div>
          <p className="hero__headline">Wipe hard. Loot louder.</p>
          <p className="hero__support">{BRAND.tagline}</p>
          <div className="hero__cta">
            <Link className="btn btn--solid" href="/store">
              Get VIP
            </Link>
            <a className="btn btn--ghost" href={BRAND.discord} target="_blank" rel="noreferrer">
              Join Discord
            </a>
          </div>
        </div>
      </section>

      <RecentPurchases />

      <section className="band">
        <div className="section-head">
          <h2>Staff</h2>
          <p className="muted">The crew keeping SEA 10X fair and loud.</p>
        </div>
        <div className="staff-row">
          {staff.map((person) => (
            <article key={person.id} className="staff-person">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="staff-person__avatar"
                src={person.avatarUrl || BRAND.logo}
                alt=""
                width={64}
                height={64}
              />
              <h3 className="staff-person__name">{person.name}</h3>
              <p className="staff-person__role">{person.role}</p>
            </article>
          ))}
        </div>
      </section>

      {announcements.length > 0 && (
        <section className="band">
          <div className="section-head">
            <h2>Announcements</h2>
            <p className="muted">Wipe notes and kit updates from the team.</p>
          </div>
          <div className="stack">
            {announcements.map((item) => (
              <article key={item.id} className="rule-block">
                <p className="rule-block__cat">{item.pinned ? "Pinned" : "News"}</p>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
