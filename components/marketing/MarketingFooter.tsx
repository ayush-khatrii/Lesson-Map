import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function MarketingFooter() {
  return (
    <footer className="mx-auto flex w-full max-w-6xl flex-col gap-6 border-t border-border px-6 py-8 text-sm sm:flex-row sm:items-center sm:justify-between lg:px-8">
      <div>
        <Link href="/" className="font-semibold tracking-tight">LessonMap</Link>
        <p className="mt-1 text-muted-foreground">Built by <a className="underline underline-offset-4 hover:text-foreground" href="https://ayushkhatri.in" target="_blank" rel="noreferrer">Ayush Khatri</a>.</p>
      </div>
      <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-6 gap-y-3 text-muted-foreground">
        <Link href="/examples" className="hover:text-foreground">Examples</Link>
        <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
        <Link href="/about" className="hover:text-foreground">About</Link>
        <a href="https://github.com/ayush-khatrii/Lesson-Map" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">GitHub <ArrowUpRight aria-hidden="true" className="size-3.5" /></a>
      </nav>
    </footer>
  );
}
