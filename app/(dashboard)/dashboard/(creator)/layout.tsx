import type { Metadata } from "next";
import Navbar from "@/components/Nav/Navbar";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <section className="min-h-screen bg-background text-foreground overflow-hidden"><Navbar />{children}</section>;
}
