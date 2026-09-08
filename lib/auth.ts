import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/prisma";

export const auth = betterAuth({
  baseURL: {
    allowedHosts: ["lessonmap.vercel.app", "*.vercel.app", "localhost:*"],
    protocol: "auto",
    fallback: "https://lessonmap.vercel.app",
  },
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  account: {
    accountLinking: {
      enabled: true,
    },
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },
});
