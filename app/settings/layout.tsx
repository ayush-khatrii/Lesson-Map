import type { Metadata } from "next";
import Navbar from "@/components/Nav/Navbar";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="min-h-screen bg-background text-foreground">
      <Navbar />
      {children}
    </section>
  );
}
