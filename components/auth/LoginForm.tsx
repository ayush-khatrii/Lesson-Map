"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { FaGithub, FaGoogle } from "react-icons/fa";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { signIn, signUp } from "@/lib/auth-client";
import { getAuthRedirect } from "@/lib/auth-redirect";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const providers = [
  { id: "google", label: "Google", icon: FaGoogle },
  { id: "github", label: "GitHub", icon: FaGithub },
] as const;

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [pending, setPending] = useState<"email" | "google" | "github" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const callbackURL = getAuthRedirect(searchParams.get("callbackUrl"));

  async function handleEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const email = String(values.get("email") || "").trim();
    const password = String(values.get("password") || "");
    const name = String(values.get("name") || "").trim();
    setError(null);
    setNotice(null);
    if (isSignUp && !name) {
      setError("Please enter your name.");
      return;
    }
    setPending("email");
    try {
      const result = isSignUp
        ? await signUp.email({ name, email, password })
        : await signIn.email({ email, password, callbackURL });
      if (result.error) {
        setError(result.error.status === 429
          ? "Too many attempts. Please wait a minute and try again."
          : isSignUp
            ? "Unable to create your account. Check your details or try signing in."
            : "Unable to sign in. Check your email and password and try again.");
        return;
      }
      form.reset();
      setShowPassword(false);
      if (isSignUp) {
        setIsSignUp(false);
        setNotice("If this email is available, your account is ready. Sign in to continue. If you previously used Google or GitHub, continue with that provider.");
      } else {
        // A fresh navigation ensures server components read the new session cookie.
        window.location.assign(callbackURL);
      }
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setPending(null);
    }
  }

  async function handleSocial(provider: "google" | "github") {
    if (pending) return;
    setPending(provider);
    setError(null);
    setNotice(null);
    try {
      const result = await signIn.social({
        provider, callbackURL, newUserCallbackURL: callbackURL, errorCallbackURL: "/auth-error",
      });
      if (result.error) setError("Unable to sign in with this provider. Please try again.");
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className={cn("rounded-2xl border bg-card p-6 shadow-sm sm:p-8", className)} {...props}>
      <div className="mb-6 space-y-2 text-center">
        <p className="text-sm font-semibold text-primary">LessonMap</p>
        <h1 className="text-2xl font-bold tracking-tight">{isSignUp ? "Create your account" : "Welcome back"}</h1>
        <p className="text-sm text-muted-foreground">{isSignUp ? "Start building your course outlines." : "Sign in to continue building your courses."}</p>
      </div>
      <form key={isSignUp ? "signup" : "signin"} onSubmit={handleEmail} className="space-y-4">
        <fieldset disabled={pending !== null} className="space-y-4">
          <legend className="sr-only">{isSignUp ? "Create an account with email" : "Sign in with email"}</legend>
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="auth-name">Name</Label>
              <Input id="auth-name" name="name" autoComplete="name" required maxLength={60} placeholder="Your name" />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="auth-email">Email</Label>
            <Input id="auth-email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="auth-password">Password</Label>
            <div className="relative">
              <Input id="auth-password" name="password" type={showPassword ? "text" : "password"} autoComplete={isSignUp ? "new-password" : "current-password"} required minLength={isSignUp ? 12 : undefined} maxLength={128} className="pr-12" aria-describedby={isSignUp ? "password-hint" : undefined} />
              <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-9 w-10" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
            {isSignUp && <p id="password-hint" className="text-xs text-muted-foreground">Use 12–128 characters. A long, unique passphrase works well.</p>}
          </div>
          <Button type="submit" className="w-full" aria-busy={pending === "email"}>
            {pending === "email" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {isSignUp ? "Create account" : "Sign in"}
          </Button>
        </fieldset>
      </form>
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="mt-4 text-sm text-muted-foreground">{notice}</p>}
      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />or continue with<span className="h-px flex-1 bg-border" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {providers.map(({ id, label, icon: Icon }) => (
          <Button key={id} onClick={() => void handleSocial(id)} variant="outline" type="button" disabled={pending !== null} aria-busy={pending === id}>
            {pending === id ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Icon aria-hidden="true" />}
            {label}
          </Button>
        ))}
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isSignUp ? "Already have an account? " : "New to LessonMap? "}
        <button type="button" disabled={pending !== null} className="rounded text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50" onClick={() => { setIsSignUp(!isSignUp); setError(null); setNotice(null); setShowPassword(false); }}>
          {isSignUp ? "Sign in" : "Create an account"}
        </button>
      </p>
    </div>
  );
}
