"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { BookOpen, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminAuthClient } from "@/lib/admin/client";

export function AdminLogin({ configured }: { configured: boolean }) {
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("error"))
      setError("Unable to sign in. Use your LessonMap email and password.");
  }, []);
  async function emailLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await adminAuthClient.signIn.email({
        email: String(form.get("email")).trim().toLowerCase(),
        password: String(form.get("password")),
        callbackURL: "/dashboard/admin/verify",
        rememberMe: false,
      });
      if (result.error) {
        setError(
          result.error.status === 429
            ? "Too many attempts. Please wait and try again."
            : "Unable to sign in with these credentials.",
        );
        return;
      }
      window.location.assign("/dashboard/admin/verify");
    } catch {
      setError("The sign-in service is unavailable. Please try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-5">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 text-sm font-semibold"
        >
          <BookOpen className="size-5 text-primary" />
          LessonMap
        </Link>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="mb-6">
            <div className="mb-4 flex size-10 items-center justify-center rounded-lg border bg-muted">
              <ShieldCheck className="size-5" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">
              Business sign-in
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Sign in to your private business workspace. Access is limited to
              approved administrators.
            </p>
          </div>
          {!configured && (
            <p
              role="alert"
              className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"
            >
              Administrator access is not configured yet. Contact the
              application owner.
            </p>
          )}
          <form onSubmit={emailLogin} className="space-y-4">
            <fieldset disabled={pending || !configured} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="you@company.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <Input
                  id="admin-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>
              <Button className="w-full" disabled={pending}>
                {pending && <Loader2 className="size-4 animate-spin" />}
                Sign in with email
              </Button>
            </fieldset>
          </form>
          {error && (
            <p role="alert" className="mt-4 text-xs text-destructive">
              {error}
            </p>
          )}
          <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            Authenticator verification follows sign-in
          </p>
        </div>
        <p className="mt-5 text-center text-xs text-muted-foreground">
          <Link href="/dashboard" className="underline underline-offset-4">
            Return to creator workspace
          </Link>
        </p>
      </div>
    </div>
  );
}
