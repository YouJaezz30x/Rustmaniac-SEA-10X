import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireUser() {
  const session = await getSession();
  if (!session?.user?.id) return null;
  return session;
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session?.user?.id || session.user.role !== "ADMIN") return null;
  return session;
}
