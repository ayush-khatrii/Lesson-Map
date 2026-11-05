"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { changePassword } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const fields = [
  { name: "currentPassword", label: "Current password", autoComplete: "current-password" },
  { name: "newPassword", label: "New password", autoComplete: "new-password" },
  { name: "confirmPassword", label: "Confirm new password", autoComplete: "new-password" },
] as const;

type PasswordField = (typeof fields)[number]["name"];

export default function ChangePasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [pending, setPending] = useState(false);
  const [visible, setVisible] = useState<Partial<Record<PasswordField, boolean>>>({});
  const [error, setError] = useState<{ field?: PasswordField; message: string } | null>(null);

  if (!hasPassword) {
    return (
      <p className="text-sm leading-6 text-muted-foreground">
        You sign in with Google or GitHub and do not have a LessonMap password.
        Manage your password with your sign-in provider.
      </p>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const currentPassword = String(values.get("currentPassword") || "");
    const newPassword = String(values.get("newPassword") || "");
    const confirmPassword = String(values.get("confirmPassword") || "");
    setError(null);

    function showError(message: string, field?: PasswordField) {
      setError({ message, field });
      toast.error(message);
      if (field) requestAnimationFrame(() => {
        (form.elements.namedItem(field) as HTMLInputElement | null)?.focus();
      });
    }

    if (newPassword !== confirmPassword) {
      showError("New passwords do not match.", "confirmPassword");
      return;
    }
    if (newPassword === currentPassword) {
      showError("Choose a new password different from your current password.", "newPassword");
      return;
    }

    setPending(true);
    try {
      const result = await changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (result.error) {
        if (result.error.code === "INVALID_PASSWORD") {
          showError("Your current password is incorrect.", "currentPassword");
        } else if (result.error.status === 429) {
          showError("Too many attempts. Please wait a minute and try again.");
        } else if (result.error.status === 401) {
          showError("Your session has expired. Please sign in again.");
        } else {
          showError("Unable to update your password. Please try again.");
        }
        return;
      }
      form.reset();
      setVisible({});
      toast.success("Password updated successfully.");
    } catch {
      showError("Unable to connect. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <fieldset disabled={pending} className="grid min-w-0 gap-4 sm:grid-cols-2">
        <legend className="sr-only">Change your password</legend>
        {fields.map(({ name, label, autoComplete }) => (
          <div key={name} className={name === "currentPassword" ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}>
            <Label htmlFor={name} className="text-xs font-medium">{label}</Label>
            <div className="relative">
              <Input
                id={name}
                name={name}
                type={visible[name] ? "text" : "password"}
                autoComplete={autoComplete}
                required
                minLength={name === "currentPassword" ? undefined : 12}
                maxLength={128}
                aria-invalid={error?.field === name}
                aria-describedby={error?.field === name ? "change-password-error" : name !== "currentPassword" ? "change-password-hint" : undefined}
                className="h-10 rounded-md border-border bg-transparent pr-11 shadow-none dark:bg-transparent"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 size-10"
                onClick={() => setVisible((previous) => ({ ...previous, [name]: !previous[name] }))}
                aria-label={`${visible[name] ? "Hide" : "Show"} ${label.toLowerCase()}`}
                aria-pressed={Boolean(visible[name])}
              >
                {visible[name] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
          </div>
        ))}
      </fieldset>
      <p id="change-password-hint" className="text-xs leading-5 text-muted-foreground">
        Use 12–128 characters. Other devices will be signed out after the update.
      </p>
      {error && <p id="change-password-error" role="alert" className="text-sm text-destructive">{error.message}</p>}
      <Button type="submit" disabled={pending} aria-busy={pending} className="w-full sm:w-auto">
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <LockKeyhole className="size-4" aria-hidden="true" />}
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
