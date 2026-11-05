"use client";
import { useState, type FormEvent } from "react";
import {
  Check,
  Copy,
  KeyRound,
  Loader2,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminFetch } from "@/lib/admin/client";
import {
  PageHeading,
  Panel,
  TableFrame,
  LoadingState,
  ErrorState,
  Empty,
  displayDate,
  useAdminReport,
  useFreshAction,
} from "./Shared";
type Member = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  enrolled: boolean;
  createdAt: string;
};
type AccessData = {
  role: string;
  currentUserId: string;
  members: Member[];
  logs: { id: string; action: string; actor: string; createdAt: string }[];
};

export function AdminSettings() {
  const query = useAdminReport<AccessData>("access"),
    fresh = useFreshAction();
  const [email, setEmail] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [revoke, setRevoke] = useState<Member | null>(null),
    [recoveryOpen, setRecoveryOpen] = useState(false),
    [code, setCode] = useState(""),
    [codes, setCodes] = useState<string[]>([]),
    [copied, setCopied] = useState(false);
  async function grant(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await fresh.run(async () => {
        setBusy(true);
        try {
          await adminFetch("/api/admin/access", {
            method: "POST",
            body: JSON.stringify({ email }),
          });
          setEmail("");
          setSuccess(
            "Dashboard access granted. The user must enroll an authenticator when signing in.",
          );
          await query.refetch();
        } finally {
          setBusy(false);
        }
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to grant access.");
    }
  }
  async function revokeAccess() {
    if (!revoke) return;
    const target = revoke;
    setError("");
    try {
      await fresh.run(async () => {
        setBusy(true);
        try {
          await adminFetch("/api/admin/access", {
            method: "PATCH",
            body: JSON.stringify({ userId: target.userId, active: false }),
          });
          setRevoke(null);
          await query.refetch();
        } finally {
          setBusy(false);
        }
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to revoke access.");
    }
  }
  async function recovery(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await adminFetch<{ recoveryCodes: string[] }>(
        "/api/admin/security/rotate-recovery",
        { method: "POST", body: JSON.stringify({ code }) },
      );
      setCode("");
      setCodes(result.recoveryCodes);
      await query.refetch();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to regenerate recovery codes.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        title="Settings"
        description="Manage dashboard access, authenticator recovery, and administrative activity."
      />
      {query.isRefetchError && query.data && (
        <p role="status" className="text-xs text-destructive">
          Could not refresh. Showing the last loaded results.
        </p>
      )}
      {query.isPending ? (
        <LoadingState />
      ) : query.isError && !query.data ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        query.data && (
          <>
            <div className="grid items-start gap-4 xl:grid-cols-3">
              <div className="space-y-4 xl:col-span-2">
                <Panel
                  borderless
                  title="Administrators"
                  description="Approved existing users with access to the business workspace"
                >
                  <TableFrame>
                    <thead>
                      <tr>
                        <th>Administrator</th>
                        <th>Role</th>
                        <th>Authenticator</th>
                        <th>Access</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {query.data.members.map((m) => (
                        <tr key={m.id}>
                          <td>
                            <p className="font-medium">
                              {m.name}
                              {m.userId === query.data!.currentUserId && (
                                <span className="ml-1 text-[10px] text-muted-foreground">
                                  (you)
                                </span>
                              )}
                            </p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {m.email}
                            </p>
                          </td>
                          <td>
                            <Badge
                              variant="outline"
                              className="text-[10px] font-normal"
                            >
                              {m.role === "SUPER_ADMIN"
                                ? "Super admin"
                                : "Admin"}
                            </Badge>
                          </td>
                          <td className="text-muted-foreground">
                            {m.enrolled ? "Enrolled" : "Setup required"}
                          </td>
                          <td>
                            <Badge
                              variant={m.active ? "secondary" : "outline"}
                              className="text-[10px] font-normal"
                            >
                              {m.active ? "Active" : "Revoked"}
                            </Badge>
                          </td>
                          <td>
                            {query.data!.role === "SUPER_ADMIN" &&
                              m.role !== "SUPER_ADMIN" &&
                              m.active && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-[11px] text-destructive"
                                  onClick={() => {
                                    setError("");
                                    setRevoke(m);
                                  }}
                                >
                                  Revoke
                                </Button>
                              )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </TableFrame>
                </Panel>
                {query.data.role === "SUPER_ADMIN" && (
                  <Panel
                    title="Grant dashboard access"
                    description="Only the super admin can add or remove administrators"
                  >
                    <form onSubmit={grant} className="space-y-3 p-4">
                      <Label htmlFor="grant-email">Existing user email</Label>
                      <div className="flex flex-wrap gap-2">
                        <Input
                          id="grant-email"
                          type="email"
                          required
                          placeholder="teammate@company.com"
                          autoComplete="off"
                          className="min-w-48 flex-1 text-xs"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                        <Button size="sm" disabled={busy}>
                          {busy ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <UserPlus className="size-3.5" />
                          )}
                          Grant access
                        </Button>
                      </div>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        Administrators can view customer and revenue data. They
                        must already have a LessonMap account and complete
                        authenticator setup.
                      </p>
                      {error && !revoke && !recoveryOpen && (
                        <p role="alert" className="text-xs text-destructive">
                          {error}
                        </p>
                      )}
                      {success && (
                        <p
                          role="status"
                          className="text-xs text-emerald-600 dark:text-emerald-400"
                        >
                          {success}
                        </p>
                      )}
                    </form>
                  </Panel>
                )}
              </div>
              <Panel
                title="Your security"
                description="Protection for your business account"
              >
                <div className="space-y-4 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md border bg-muted p-2">
                      <ShieldCheck className="size-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">
                        Authenticator enabled
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Required at every admin sign-in.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 border-t pt-4 text-[11px] text-muted-foreground">
                    <p>Sessions end after eight hours.</p>
                    <p>
                      The workspace locks after 30 minutes without activity.
                    </p>
                    <p>
                      Recovery signs out every admin session for your account.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => {
                      setRecoveryOpen(true);
                      setCodes([]);
                      setCode("");
                      setError("");
                      setCopied(false);
                    }}
                  >
                    <KeyRound className="size-3.5" />
                    Generate new recovery codes
                  </Button>
                </div>
              </Panel>
            </div>
            <Panel
              borderless
              title="Recent administrative activity"
              description="Access changes and security verification"
            >
              {query.data.logs.length ? (
                <TableFrame>
                  <thead>
                    <tr>
                      <th>Activity</th>
                      <th>Actor</th>
                      <th>Date · Asia/Kolkata</th>
                    </tr>
                  </thead>
                  <tbody>
                    {query.data.logs.map((log) => (
                      <tr key={log.id}>
                        <td className="font-medium">
                          {log.action.toLowerCase().replaceAll("_", " ")}
                        </td>
                        <td className="text-muted-foreground">{log.actor}</td>
                        <td className="text-muted-foreground">
                          {displayDate(log.createdAt)} ·{" "}
                          {new Intl.DateTimeFormat("en-IN", {
                            timeZone: "Asia/Kolkata",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(log.createdAt))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </TableFrame>
              ) : (
                <Empty message="No administrative activity yet." />
              )}
            </Panel>
          </>
        )
      )}
      <Dialog
        open={Boolean(revoke)}
        onOpenChange={(v) => {
          if (!v && !busy) setRevoke(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Revoke dashboard access?</DialogTitle>
            <DialogDescription>
              {revoke?.name} will lose dashboard access immediately. Their
              regular LessonMap account stays available.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setRevoke(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => void revokeAccess()}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}Revoke access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={recoveryOpen}
        onOpenChange={(v) => {
          if (!busy) {
            setRecoveryOpen(v);
            if (!v) setCodes([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {codes.length
                ? "Save your recovery codes"
                : "Replace recovery codes"}
            </DialogTitle>
            <DialogDescription>
              {codes.length
                ? "Save these securely. They are shown once and replace all previous recovery codes."
                : "Enter the current authenticator code to replace your existing recovery codes."}
            </DialogDescription>
          </DialogHeader>
          {codes.length ? (
            <>
              <div className="grid gap-2 rounded-md border bg-muted/40 p-3 font-mono text-[11px]">
                {codes.map((c) => (
                  <span key={c}>{c}</span>
                ))}
              </div>
              <div className="flex justify-between gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(codes.join("\n"));
                      setCopied(true);
                    } catch {
                      setError(
                        "Save the codes manually; clipboard access is unavailable.",
                      );
                    }
                  }}
                >
                  {copied ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  Copy codes
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setCodes([]);
                    setRecoveryOpen(false);
                  }}
                >
                  I have saved these codes
                </Button>
              </div>
            </>
          ) : (
            <form onSubmit={recovery} className="space-y-4">
              <Label htmlFor="recovery-verify">Authenticator code</Label>
              <Input
                id="recovery-verify"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <Button className="w-full" disabled={busy}>
                {busy && <Loader2 className="size-4 animate-spin" />}Generate
                recovery codes
              </Button>
            </form>
          )}
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
        </DialogContent>
      </Dialog>
      {fresh.dialog}
    </>
  );
}
