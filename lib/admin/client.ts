"use client";
import { createAuthClient } from "better-auth/react";
export const adminAuthClient = createAuthClient({
  basePath: "/api/admin/auth",
});

export class AdminClientError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}
export async function adminFetch<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await response
    .json()
    .catch(() => ({ error: "The service is unavailable. Please try again." }));
  if (!response.ok) {
    if (body.code === "SIGN_IN_REQUIRED") {
      window.location.assign("/dashboard/admin/login");
    }
    if (body.code === "VERIFICATION_REQUIRED") {
      window.location.assign("/dashboard/admin/verify");
    }
    throw new AdminClientError(
      body.error || "Unable to complete this request.",
      body.code,
    );
  }
  return body as T;
}
