import type { Metadata } from "next";
// @ts-ignore
import "@/app/globals.css";
import Navbar from "@/components/Nav/Navbar";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function OutlineLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <main>
        <Navbar />
        {children}
      </main>
    </div>
  );
}
