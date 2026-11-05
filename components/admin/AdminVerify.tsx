"use client";
import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Check, Copy, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminFetch, adminAuthClient } from "@/lib/admin/client";

export function AdminVerify() {
  const status = useQuery({
    queryKey: ["admin", "security-status"],
    queryFn: () =>
      adminFetch<{ enrolled: boolean; email: string }>(
        "/api/admin/security/status",
      ),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const [setup, setSetup] = useState<{ qrCode: string; secret: string } | null>(
      null,
    ),
    [code, setCode] = useState(""),
    [recovery, setRecovery] = useState(false),
    [codes, setCodes] = useState<string[]>([]),
    [saved, setSaved] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [copied, setCopied] = useState(false);
  async function begin() {
    setPending(true);
    setError("");
    try {
      setSetup(
        await adminFetch("/api/admin/security/enroll", {
          method: "POST",
          body: "{}",
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to start setup.");
    } finally {
      setPending(false);
    }
  }
  async function verify(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const result = await adminFetch<{
        recoveryCodes?: string[];
        signInRequired?: boolean;
      }>(
        `/api/admin/security/${recovery ? "recover" : setup ? "confirm" : "verify"}`,
        { method: "POST", body: JSON.stringify({ code }) },
      );
      setCode("");
      if (result.signInRequired) {
        window.location.assign("/dashboard/admin/login");
        return;
      }
      if (result.recoveryCodes) {
        setCodes(result.recoveryCodes);
        setSetup(null);
      } else window.location.assign("/dashboard/admin");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to verify this code.");
    } finally {
      setPending(false);
    }
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setError("Copy is unavailable. Save these values manually.");
    }
  }
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-5">
      <div className="w-full max-w-md">
        <div className="mb-7 flex items-center justify-center gap-2 text-sm font-semibold">
          <BookOpen className="size-5 text-primary" />
          LessonMap
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex size-10 items-center justify-center rounded-lg border bg-muted">
            <ShieldCheck className="size-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            {codes.length
              ? "Save your recovery codes"
              : recovery
                ? "Recover dashboard access"
                : status.data?.enrolled
                  ? "Verify your identity"
                  : "Set up your authenticator"}
          </h1>
          {status.isPending ? (
            <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Checking your account…
            </p>
          ) : status.error ? (
            <p role="alert" className="mt-4 text-xs text-destructive">
              {status.error.message}
            </p>
          ) : codes.length ? (
            <>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Store these somewhere safe. Each code can be used once to
                recover access. They will not be shown again.
              </p>
              <div className="my-4 grid gap-2 rounded-md border bg-muted/40 p-3 font-mono text-[11px]">
                {codes.map((c) => (
                  <span key={c}>{c}</span>
                ))}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void copy(codes.join("\n"))}
              >
                {copied ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                Copy recovery codes
              </Button>
              <label className="my-5 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={saved}
                  onChange={(e) => setSaved(e.target.checked)}
                  className="accent-primary"
                />
                I have saved my recovery codes
              </label>
              <Button
                className="w-full"
                disabled={!saved}
                onClick={() => window.location.assign("/dashboard/admin")}
              >
                Open dashboard
              </Button>
            </>
          ) : (
            <>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {recovery
                  ? "Enter an unused recovery code. Recovery signs out all admin sessions and requires a new authenticator setup."
                  : status.data?.enrolled
                    ? "Enter the current code from your authenticator app to unlock your business workspace."
                    : "Connect an authenticator app before accessing business data."}
              </p>
              {!status.data?.enrolled && !setup ? (
                <Button
                  className="mt-5 w-full"
                  disabled={pending}
                  onClick={() => void begin()}
                >
                  {pending && <Loader2 className="size-4 animate-spin" />}Start
                  authenticator setup
                </Button>
              ) : (
                <>
                  {setup && (
                    <div className="mt-4 space-y-3">
                      <div className="flex justify-center rounded-md border bg-white p-2">
                        <img
                          src={setup.qrCode}
                          alt="Scan to add LessonMap Admin to your authenticator"
                          width={240}
                          height={240}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Scan the QR code, or add this setup key manually:
                      </p>
                      <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2">
                        <code className="min-w-0 flex-1 break-all text-[11px]">
                          {setup.secret}
                        </code>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 shrink-0"
                          aria-label="Copy setup key"
                          onClick={() => void copy(setup.secret)}
                        >
                          <Copy className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                  <form onSubmit={verify} className="mt-5 space-y-3">
                    <Label htmlFor="admin-code">
                      {recovery ? "Recovery code" : "Authenticator code"}
                    </Label>
                    <Input
                      id="admin-code"
                      type={recovery ? "password" : "text"}
                      inputMode={recovery ? "text" : "numeric"}
                      autoComplete="one-time-code"
                      autoFocus
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      disabled={pending}
                    />
                    <Button className="w-full" disabled={pending}>
                      {pending && <Loader2 className="size-4 animate-spin" />}
                      {recovery
                        ? "Recover access"
                        : setup
                          ? "Confirm setup"
                          : "Unlock dashboard"}
                    </Button>
                  </form>
                </>
              )}
              {status.data?.enrolled && (
                <button
                  className="mt-4 text-xs text-muted-foreground underline underline-offset-4"
                  disabled={pending}
                  onClick={() => {
                    setRecovery(!recovery);
                    setCode("");
                    setError("");
                  }}
                >
                  {recovery
                    ? "Use authenticator instead"
                    : "Use a recovery code"}
                </button>
              )}
            </>
          )}
          {error && (
            <p role="alert" className="mt-4 text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 w-full text-xs text-muted-foreground"
          onClick={async () => {
            try {
              await adminFetch("/api/admin/security/logout", {
                method: "POST",
                body: "{}",
              });
              await adminAuthClient.signOut();
              window.location.assign("/dashboard/admin/login");
            } catch {
              setError("Unable to sign out. Please try again.");
            }
          }}
        >
          Sign in with another account
        </Button>
      </div>
    </div>
  );
}
