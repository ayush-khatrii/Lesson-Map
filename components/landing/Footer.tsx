import Link from "next/link";
import Brand from "@/components/Brand";
import CurrentYear from "@/components/CurrentYear";
import { FOOTER } from "@/constants/footer";
import { shell } from "./styles";

export default function Footer() {
  return (
    <footer className="border-t border-border/70 bg-muted/20">
      <div className={`${shell} py-14 sm:py-20`}>
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_0.9fr_1.2fr] lg:gap-12">
          <div>
            <Brand preload />
            <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">{FOOTER.description}</p>
          </div>
          {FOOTER.sections.map((section) => (
            <div key={section.title} className="min-w-0 sm:pt-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest">{section.title}</h2>
              <nav aria-label={section.title} className="mt-5 flex flex-col gap-3">
                {section.links.map((link) => (
                  <Link key={link.href} href={link.href} prefetch={link.href === "/start" ? false : undefined} className="w-fit max-w-full break-words text-sm text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-border/70 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>{FOOTER.copyrightSymbol} <CurrentYear /> {FOOTER.copyright}</p>
          <p>{FOOTER.tagline}</p>
        </div>
      </div>
    </footer>
  );
}
