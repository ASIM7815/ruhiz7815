import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

// Validate required environment variables
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error(
    "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in environment variables"
  );
}

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("NEXTAUTH_SECRET must be set in environment variables");
}

async function generateUniqueUid(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const uid = String(Math.floor(10000 + Math.random() * 90000));
    const existing = await db.user.findUnique({ where: { uid } });
    if (!existing) return uid;
  }
  throw new Error("Failed to generate unique UID after 10 attempts");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  events: {
    async createUser({ user }) {
      const uid = await generateUniqueUid();
      await db.user.update({
        where: { id: user.id! },
        data: { uid },
      });
    },
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
      }
      if (trigger === "signIn" || trigger === "signUp" || !token.uid) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { uid: true, onboardingComplete: true },
        });
        if (dbUser) {
          token.uid = dbUser.uid;
          token.onboardingComplete = dbUser.onboardingComplete;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.uid = token.uid as string;
        session.user.onboardingComplete = token.onboardingComplete as boolean;
      }
      return session;
    },
  },
});
