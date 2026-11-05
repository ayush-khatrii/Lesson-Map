// @ts-ignore
import "@/app/globals.css";
import Navbar from "@/components/Nav/Navbar";
import Footer from "@/components/landing/Footer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <section className="min-h-screen bg-background text-foreground overflow-hidden">
      <Navbar />
      {children}
      <Footer />
    </section>
  );
}
