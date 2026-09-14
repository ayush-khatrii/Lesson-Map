import Navbar from "@/components/Nav/Navbar";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="min-h-screen bg-background text-foreground">
      <Navbar />
      {children}
    </section>
  );
}
