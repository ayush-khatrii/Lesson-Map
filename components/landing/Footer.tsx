import Link from "next/link";
import { ArrowUpRight, Github, Linkedin, Twitter } from "lucide-react";
import CurrentYear from "@/components/CurrentYear";
import { shell } from "./styles";

const product = [{ label: "Examples", href: "/examples" }, { label: "Pricing", href: "/pricing" }, { label: "About", href: "/about" }];

export default function Footer() {
  return (
    <footer className="border-t border-border/70 bg-muted/20">
      <div className={`${shell} py-14 sm:py-20`}>
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_0.7fr_0.8fr_1fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-xl font-bold tracking-tight">LessonMap</Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">Plan a course, organize its lessons and resources, and share it with one link.</p>
            <p className="mt-5 text-xs text-muted-foreground">Built by <a className="font-semibold text-foreground underline decoration-border underline-offset-4 transition hover:decoration-foreground" href="https://ayushkhatri.in/" target="_blank" rel="noreferrer">Ayush Khatri <ArrowUpRight className="inline size-3" /></a></p>
          </div>
          <div><h3 className="text-xs font-semibold uppercase tracking-widest">Product</h3><nav aria-label="Product" className="mt-5 flex flex-col gap-3">{product.map((link) => <Link key={link.href} href={link.href} className="w-fit text-sm text-muted-foreground transition hover:text-foreground">{link.label}</Link>)}</nav></div>
          <div><h3 className="text-xs font-semibold uppercase tracking-widest">Legal</h3><div className="mt-5 flex flex-col gap-3 text-sm text-muted-foreground"><span title="Link coming soon">Privacy Policy</span><span title="Link coming soon">Terms of Service</span><span title="Link coming soon">Refund Policy</span></div></div>
          <div><h3 className="text-xs font-semibold uppercase tracking-widest">Payments & socials</h3><div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground"><span className="grid size-5 place-items-center rounded bg-foreground text-[9px] font-bold text-background">D</span>Payments powered by Dodo</div><div className="mt-4 flex gap-2"><a href="https://github.com/ayush-khatrii/Lesson-Map" target="_blank" rel="noreferrer" aria-label="LessonMap on GitHub" className="grid size-9 place-items-center rounded-lg border border-border bg-background text-muted-foreground transition hover:-translate-y-0.5 hover:text-foreground"><Github className="size-4" /></a><span aria-label="Twitter profile coming soon" role="img" className="grid size-9 place-items-center rounded-lg border border-border bg-background text-muted-foreground/50"><Twitter className="size-4" /></span><span aria-label="LinkedIn profile coming soon" role="img" className="grid size-9 place-items-center rounded-lg border border-border bg-background text-muted-foreground/50"><Linkedin className="size-4" /></span></div></div>
        </div>
        <div className="mt-14 flex flex-col gap-3 border-t border-border/70 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><p>© <CurrentYear /> LessonMap. All rights reserved.</p><p>Plan with clarity. Teach with confidence.</p></div>
      </div>
    </footer>
  );
}
