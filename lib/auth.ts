import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/prisma";

export const auth = betterAuth({
  baseURL: {
    allowedHosts: [
      new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://lessonmap.vercel.app").host,
      ...(process.env.NODE_ENV !== "production" ? ["localhost:*"] : []),
    ],
    protocol: "auto",
    fallback: "https://lessonmap.vercel.app",
  },
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    // A generic sign-up response avoids revealing registered email addresses.
    autoSignIn: false,
  },
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
      enabled: false,
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
