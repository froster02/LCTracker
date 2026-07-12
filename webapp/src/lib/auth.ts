import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

const isDev = process.env.NODE_ENV === "development";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    ...(isDev
      ? [
          Credentials({
            name: "Dev User",
            credentials: {
              name: { label: "Name", value: "Test User" },
            },
            async authorize(credentials) {
              const user = await prisma.user.upsert({
                where: { email: "arushnaudiyal@gmail.com" },
                update: {},
                create: {
                  email: "arushnaudiyal@gmail.com",
                  name: (credentials?.name as string) || "Arush Naudiyal (Dev Mode)",
                  githubId: "dev-github-id-12345",
                },
              });
              await prisma.userStat.upsert({
                where: { userId: user.id },
                update: {},
                create: { userId: user.id },
              });
              return {
                id: user.id,
                name: user.name || "Test User",
                email: user.email,
                image: user.image,
              };
            },
          }),
        ]
      : []),
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: { scope: "read:user user:email" },
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "github") {
        // GitHub may return null email if private; fall back to noreply address
        const email =
          (profile?.email as string | null) ||
          `${profile?.id}@users.noreply.github.com`;
        const user = await prisma.user.upsert({
          where: { email },
          update: {
            name: (profile?.name as string | null) || (profile?.login as string | null),
            image: (profile?.avatar_url || profile?.image || null) as string | null,
            githubId: String(profile?.id),
          },
          create: {
            email,
            name: (profile?.name as string | null) || (profile?.login as string | null),
            image: (profile?.avatar_url || profile?.image || null) as string | null,
            githubId: String(profile?.id),
          },
        });
        await prisma.userStat.upsert({
          where: { userId: user.id },
          update: {},
          create: { userId: user.id },
        });
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.sub = user.id;
      }
      if (account?.provider === "github") {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      session.accessToken = token.accessToken as string | undefined;
      return session;
    },
  },
  pages: isDev
    ? {
        signIn: "/auth/signin",
      }
    : undefined,
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    accessToken?: string;
  }

  interface User {
    id: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    accessToken?: string;
  }
}
