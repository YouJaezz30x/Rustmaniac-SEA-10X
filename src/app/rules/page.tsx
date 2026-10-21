import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Rules" };
export const dynamic = "force-dynamic";

export default async function RulesPage() {
  const rules = await prisma.rule.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="page">
      <h1 className="page__title">Server rules</h1>
      <p className="page__lead">
        The same rules as in game (/info → Rules) and in #rules on Discord. Breaking them can lead
        to a warning, mute, kick or ban.
      </p>
      <div className="stack">
        {rules.map((rule) => (
          <article key={rule.id} className="rule-block">
            <p className="rule-block__cat">{rule.category}</p>
            <h3>{rule.title}</h3>
            <p>{rule.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
