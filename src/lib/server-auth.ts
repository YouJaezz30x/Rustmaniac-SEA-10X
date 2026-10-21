import { timingSafeEqual } from "crypto";

/** True when the request carries `Authorization: Bearer <SERVER_API_KEY>` from the RustmaniacStore plugin. */
export function isGameServer(req: Request): boolean {
  const key = process.env.SERVER_API_KEY;
  if (!key || key.length < 32) return false;
  const header = req.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (given.length !== key.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(key));
}
