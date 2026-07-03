import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
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
                  googleId: "dev-google-id-12345",
                },
              });
              // Ensure stats exist
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
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        const user = await prisma.user.upsert({
          where: { email: profile.email },
          update: {
            name: profile.name as string | null,
            image: (profile.picture || profile.image || null) as string | null,
            googleId: profile.sub as string,
          },
          create: {
            email: profile.email,
            name: profile.name as string | null,
            image: (profile.picture || profile.image || null) as string | null,
            googleId: profile.sub as string,
          },
        });
        // Ensure stats exist
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
      if (account?.provider === "google") {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      session.accessToken = token.accessToken as string | undefined;
      session.refreshToken = token.refreshToken as string | undefined;
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
    refreshToken?: string;
  }

  interface User {
    id: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  }
}
