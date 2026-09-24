import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, Mail } from "lucide-react";
import Reveal from "@/components/marketing/Reveal";
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_EFFECTIVE_DATE,
  POLICY_LINKS,
  type PolicyKey,
} from "./config";

/**
 * Shared shell for the legal pages. Keeps /privacy, /terms and /refund visually
 * identical without duplicating layout code across the three route files.
 */
export default function LegalPage({
  title,
  intro,
  current,
  children,
}: {
  title: string;
  intro: string;
  current: PolicyKey;
  children: ReactNode;
}) {
  const others = POLICY_LINKS.filter((policy) => policy.key !== current);

  return (
    <main className="min-h-screen bg-background pb-20 pt-24 text-foreground sm:pt-28">
      <div className="mx-auto w-full max-w-3xl px-5 sm:px-8">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground dark:text-primary">
            Legal
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">{intro}</p>
          <p className="mt-4 text-xs text-muted-foreground">Last updated {LEGAL_EFFECTIVE_DATE}</p>
        </Reveal>

        <div className="mt-12 space-y-6">{children}</div>

        <Reveal className="mt-12 rounded-2xl border border-border/80 bg-muted/20 p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold tracking-tight">Questions or requests</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Contact us about this policy, your data, or a billing question and we will respond as
            soon as we can.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <a
              href={`mailto:${LEGAL_CONTACT_EMAIL}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-medium transition hover:bg-muted/50"
            >
              <Mail className="size-4" aria-hidden="true" />
              {LEGAL_CONTACT_EMAIL}
            </a>
            {others.map((policy) => (
              <Link
                key={policy.key}
                href={policy.href}
                className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
              >
                {policy.label}
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </Reveal>
      </div>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Reveal className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">{children}</div>
    </Reveal>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, index) => (
        <li key={index} className="flex gap-3">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
