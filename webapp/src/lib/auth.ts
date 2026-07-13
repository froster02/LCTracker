import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

// GitHub returns a null email when the user's email is private
function githubEmail(profile: Record<string, unknown> | null | undefined): string {
  return (
    (profile?.email as string | null) || `${profile?.id}@users.noreply.github.com`
  );
}

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
        // `repo` is required to create the user's leettracker02 repo and
        // commit accepted solutions to it (see lib/github-sync.ts)
        params: { scope: "read:user user:email repo" },
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "github") {
        const email = githubEmail(profile);
        const shared = {
          name: (profile?.name as string | null) || (profile?.login as string | null),
          image: (profile?.avatar_url || profile?.image || null) as string | null,
          githubId: String(profile?.id),
          githubLogin: (profile?.login as string | null) ?? null,
          // stored encrypted; used server-side to commit solutions to the user's repo
          githubAccessToken: account.access_token ? await encrypt(account.access_token) : null,
        };
        const user = await prisma.user.upsert({
          where: { email },
          update: shared,
          create: { email, ...shared },
        });
        await prisma.userStat.upsert({
          where: { userId: user.id },
          update: {},
          create: { userId: user.id },
        });
      }
      return true;
    },
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "github") {
        // user.id here is the GitHub numeric id, not our cuid — resolve the DB id
        const dbUser = await prisma.user.findUnique({
          where: { email: githubEmail(profile) },
          select: { id: true },
        });
        if (dbUser) token.sub = dbUser.id;
        token.accessToken = account.access_token;
      } else if (user) {
        // credentials dev provider returns the DB id directly
        token.sub = user.id;
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
