// @ts-ignore
import "@/app/globals.css";
import Navbar from "@/components/Nav/Navbar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <section className="min-h-screen bg-background text-foreground overflow-hidden">
      <Navbar />
      {children}
    </section>
  );
}
