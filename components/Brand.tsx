import Image from "next/image";
import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export default function Brand({ name = SITE_NAME, href = "/", logoSrc = "/lm-logo.png", preload = false }: {
  name?: string;
  href?: string;
  logoSrc?: string;
  preload?: boolean;
}) {
  return (
    <Link href={href} aria-label={`${name} home`} className="inline-flex shrink-0 items-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
      <Image src={logoSrc} alt="" width={1254} height={1254} sizes="48px" preload={preload} className="size-12 shrink-0 object-contain" />
      <span className="text-xl font-bold tracking-[-0.02em] text-foreground">{name}</span>
    </Link>
  );
}
