"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Brand from "@/components/Brand";
import { usePathname } from "next/navigation";
import {
  UserRound,
  ArrowUpRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { useSession, signOut } from "@/lib/auth-client";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "motion/react";

const publicLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Examples", href: "/examples" },
  { label: "Pricing", href: "/pricing" },
];

export default function Navbar({ className }: { className?: string }) {
  const { data: session, isPending } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  const isActive = (href: string) =>
    href === "/"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links =
    mounted && session?.user
      ? [...publicLinks, { label: "Dashboard", href: "/dashboard" }]
      : publicLinks;
  const initials = session?.user.name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "U";
  const handleSignOut = async () => {
    try {
      const result = await signOut();
      if (result.error)
        return toast.error("Unable to sign out. Please try again.");
      window.location.assign("/sign-in");
    } catch {
      toast.error("Unable to sign out. Please try again.");
    }
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-300 motion-reduce:transition-none",
        scrolled
          ? "border-border/70 bg-background/95 shadow-sm backdrop-blur-xl"
          : "border-transparent bg-transparent",
        className,
      )}
    >
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:px-8"
      >
        <Brand preload />
        <div className="hidden items-center justify-center gap-8 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={cn(
                "group relative inline-flex items-center py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring motion-reduce:transition-none",
                isActive(link.href) && "text-foreground",
              )}
            >
              {link.label}
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-x-0 bottom-0 h-0.5 origin-left rounded-full bg-primary transition-transform duration-300 motion-reduce:transition-none",
                  isActive(link.href)
                    ? "scale-x-100"
                    : "scale-x-0 group-hover:scale-x-100",
                )}
              />
            </Link>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1 lg:gap-2">
          <ThemeToggle />
          {!mounted || isPending ? (
            <div role="status" className="size-9 shrink-0 rounded-full bg-muted motion-safe:animate-pulse">
              <span className="sr-only">Loading account</span>
            </div>
          ) : session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full" aria-label="Open profile menu">
                  <Avatar className="size-8 border border-border">
                    <AvatarImage src={session.user.image ?? undefined} alt="" className="object-cover" />
                    <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuLabel>
                  <p className="truncate text-sm">{session.user.name}</p>
                  <p className="truncate text-xs font-normal text-muted-foreground">
                    {session.user.email}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">
                    <LayoutDashboard />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings?tab=profile">
                    <UserRound />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings?tab=settings">
                    <Settings />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="size-9 p-0 sm:h-8 sm:w-auto sm:px-3">
              <Link href="/start" prefetch={false}>
                <span className="sr-only sm:not-sr-only">Get started</span> <ArrowUpRight aria-hidden="true" />
              </Link>
            </Button>
          )}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="size-5" />
                <span className="sr-only">Open navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[min(22rem,calc(100vw-1.5rem))] gap-0 overflow-y-auto border-border bg-background p-0 sm:max-w-sm motion-reduce:animate-none motion-reduce:transition-none [&>button:last-child]:top-6 [&>button:last-child]:right-5">
              <SheetHeader className="border-b border-border/60 px-6 py-5 text-left">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <div className="pr-6" onClick={() => setOpen(false)}>
                  <Brand />
                </div>
                <SheetDescription className="mt-2 text-xs">
                  Your next course starts here.
                </SheetDescription>
              </SheetHeader>
              <nav
                aria-label="Mobile navigation"
                className="flex flex-col gap-1 px-3 py-5"
              >
                {links.map((link, index) => (
                  <motion.div
                    key={link.href}
                    initial={reduceMotion ? false : { opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.3,
                      delay: reduceMotion ? 0 : 0.08 + index * 0.045,
                      ease: "easeOut",
                    }}
                  >
                    <SheetClose asChild>
                      <Link
                        href={link.href}
                        aria-current={isActive(link.href) ? "page" : undefined}
                        className={cn(
                          "group flex min-h-12 items-center justify-between rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none",
                          isActive(link.href)
                            ? "bg-primary/8 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        {link.label}
                        {isActive(link.href) ? (
                          <span
                            aria-hidden="true"
                            className="size-1.5 rounded-full bg-primary"
                          />
                        ) : (
                          <ArrowUpRight
                            aria-hidden="true"
                            className="size-4 opacity-40 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none"
                          />
                        )}
                      </Link>
                    </SheetClose>
                  </motion.div>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
