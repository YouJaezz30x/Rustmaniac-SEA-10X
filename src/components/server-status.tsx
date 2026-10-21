import { prisma } from "@/lib/prisma";
import { BRAND } from "@/lib/brand";

const STALE_MS = 3 * 60 * 1000;

function formatWhen(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Singapore",
  }).format(date);
}

function daysUntil(date: Date) {
  const days = Math.ceil((date.getTime() - Date.now()) / 86_400_000);
  return days <= 0 ? "today" : days === 1 ? "in 1 day" : `in ${days} days`;
}

export async function ServerStatus() {
  const status = await prisma.serverStatus.findUnique({ where: { id: "main" } }).catch(() => null);
  const live = status && Date.now() - status.updatedAt.getTime() < STALE_MS;

  return (
    <section className="band" aria-label="Server status">
      <div className="server-card">
        <div className="server-card__head">
          <span className={`server-card__dot ${live ? "is-online" : ""}`} aria-hidden="true" />
          <h2>{live ? "Online now" : "Server status"}</h2>
          <span className="muted">{BRAND.region}</span>
        </div>
        <div className="server-card__stats">
          <div>
            <strong>{live ? `${status.online}/${status.maxPlayers}` : "—"}</strong>
            <span>Players</span>
          </div>
          <div>
            <strong>{live ? status.queued + status.joining : "—"}</strong>
            <span>Queue</span>
          </div>
          <div>
            <strong>{status?.worldSize ? `${status.worldSize}` : "—"}</strong>
            <span>Map size</span>
          </div>
          <div>
            <strong>{status?.nextWipe ? daysUntil(status.nextWipe) : "1st Thursday"}</strong>
            <span>{status?.nextWipe ? `Wipe · ${formatWhen(status.nextWipe)} UTC+8` : "Monthly force wipe"}</span>
          </div>
        </div>
        <div className="server-card__connect">
          <code>client.connect {BRAND.address}</code>
          <a className="btn btn--solid" href={`steam://connect/${BRAND.address}`}>
            Connect
          </a>
        </div>
      </div>
    </section>
  );
}
