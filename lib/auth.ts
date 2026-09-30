import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/prisma";
import { emailAuthOptions } from "@/lib/auth-email";

export const auth = betterAuth({
  baseURL: {
    allowedHosts: [
      new URL(
        process.env.NEXT_PUBLIC_BASE_URL || "https://lessonmap.vercel.app",
      ).host,
      ...(process.env.NODE_ENV !== "production" ? ["localhost:*"] : []),
    ],
    protocol: "auto",
    fallback: "https://lessonmap.vercel.app",
  },
  database: prismaAdapter(db, {
    provider: "postgresql",
    // Persist the user and password account together, or roll both back.
    transaction: true,
  }),
  ...emailAuthOptions((email) => db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  })),
  rateLimit: {
    enabled: true,
    storage: "database",
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
    },
  },
  account: {
    accountLinking: {
      // Do not automatically merge an unverified password account with OAuth.
      enabled: true,
    },
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
});
