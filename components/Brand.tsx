import Image from "next/image";
import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export default function Brand({
  name = SITE_NAME,
  href = "/",
  logoSrc = "/logo-2.png",
  preload = false,
}: {
  name?: string;
  href?: string;
  logoSrc?: string;
  preload?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={`${name} home`}
      className="inline-flex shrink-0 items-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary rounded-full"
    >
      <Image
        src={logoSrc}
        alt=""
        width={1254}
        height={1254}
        sizes="48px"
        preload={preload}
        className="size-8 shrink-0 object-contain rounded-xl"
      />
      <span className="text-lg mt-0 ml-[2px] font-bold  text-foreground">
        {name}
      </span>
    </Link>
  );
}
