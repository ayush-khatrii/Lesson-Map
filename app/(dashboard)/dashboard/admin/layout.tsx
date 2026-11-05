import type { Metadata } from "next";
import { Suspense } from "react";
export const metadata: Metadata = {
  title: "Business dashboard",
  robots: { index: false, follow: false },
};
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
          Opening secure workspace…
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
