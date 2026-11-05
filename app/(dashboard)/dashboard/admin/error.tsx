"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="max-w-sm space-y-4 rounded-lg border bg-card p-6">
        <h1 className="text-lg font-semibold">Workspace unavailable</h1>
        <p className="text-sm text-muted-foreground">
          We could not open the secure workspace. Try again or return to admin
          sign-in.
        </p>
        <div className="flex gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/admin/login">Sign in</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
