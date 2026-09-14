import { createAuthClient } from "better-auth/react";

export const { signIn, signUp, useSession, signOut } = createAuthClient({
  // Use the current origin for browser requests, including production.
  baseURL: process.env.NEXT_PUBLIC_BASE_URL,
});
