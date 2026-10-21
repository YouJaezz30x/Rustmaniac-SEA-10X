import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "./prisma";
import { rateLimit } from "./security";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "./auth-cookies";

const credentialsSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(6).max(200),
});

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
  },
  cookies: {
    sessionToken: {
      name: SESSION_COOKIE,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase();
        const limited = await rateLimit(`login:${email}`, 12, 60_000);
        if (!limited.ok) return null;

        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          steamId: user.steamId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "USER";
        token.steamId = (user as { steamId?: string | null }).steamId ?? null;
      }
      // Re-read the account so Steam/Discord links and role changes show up without signing out.
      if (token.id) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id },
          select: { name: true, email: true, role: true, steamId: true, discordId: true, avatarUrl: true },
        });
        if (!fresh) return { ...token, id: undefined };
        token.name = fresh.name;
        token.email = fresh.email;
        token.role = fresh.role;
        token.steamId = fresh.steamId;
        token.discordId = fresh.discordId;
        token.picture = fresh.avatarUrl;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name ?? null;
        session.user.email = token.email ?? null;
        session.user.image = token.picture ?? null;
        session.user.role = (token.role as string) ?? "USER";
        session.user.steamId = (token.steamId as string | null) ?? null;
        session.user.discordId = (token.discordId as string | null) ?? null;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}
