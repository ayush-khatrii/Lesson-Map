"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, Menu, Settings } from "lucide-react";
import { toast } from "sonner";
import { useSession, signOut } from "@/lib/auth-client";
import ThemeToggle from "@/components/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const publicLinks = [{ label: "Home", href: "/" }, { label: "About", href: "/about" }, { label: "Examples", href: "/examples" }, { label: "Pricing", href: "/pricing" }];

function Brand() {
  return <Link href="/" className="inline-flex items-center gap-2 font-bold tracking-[-0.02em] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
    <span className="text-xl ">LessonMap</span>
  </Link>;
}

export default function Navbar({ className }: { className?: string }) {
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = mounted && session?.user ? [...publicLinks, { label: "Dashboard", href: "/dashboard" }] : publicLinks;
  const initials = session?.user?.name?.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "U";
  const handleSignOut = async () => {
    try {
      const result = await signOut();
      if (result.error) return toast.error("Unable to sign out. Please try again.");
      window.location.assign("/sign-in");
    } catch { toast.error("Unable to sign out. Please try again."); }
  };

  return (
    <header className={cn("fixed inset-x-0 top-0 z-50 transition-all duration-200", scrolled ? "border-b border-border/70 bg-background/80 shadow-sm backdrop-blur-xl" : "border-b border-transparent bg-background/50 backdrop-blur-md", className)}>
      <nav aria-label="Main navigation" className="mx-auto flex h-16 max-w-7xl items-center px-5 sm:px-8 lg:px-10">
        <Brand />
        <div className="mx-auto hidden items-center gap-1 rounded-xl border border-border/70 bg-background/70 p-1 shadow-sm md:flex">
          {links.map((link) => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined} className={cn("rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary", pathname === link.href && "bg-muted text-foreground")}>{link.label}</Link>)}
        </div>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {mounted && !isPending && (session?.user ? (
            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full"><Avatar className="size-8"><AvatarImage src={session.user.image || undefined} alt={session.user.name || "User"} /><AvatarFallback className="text-xs">{initials}</AvatarFallback></Avatar><span className="sr-only">Open user menu</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-56 rounded-xl"><DropdownMenuLabel><p className="truncate text-sm">{session.user.name}</p><p className="truncate text-xs font-normal text-muted-foreground">{session.user.email}</p></DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem asChild><Link href="/dashboard"><LayoutDashboard />Dashboard</Link></DropdownMenuItem><DropdownMenuItem asChild><Link href="/settings"><Settings />Settings</Link></DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={handleSignOut} className="text-destructive"><LogOut />Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
          ) : <Button asChild size="sm" className="h-9 rounded-lg bg-foreground px-4 text-background hover:bg-foreground/85"><Link href="/sign-in">Get started</Link></Button>)}
        </div>
        <div className="ml-auto flex items-center gap-1 md:hidden"><ThemeToggle /><Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" className="rounded-lg"><Menu className="size-5" /><span className="sr-only">Open navigation menu</span></Button></SheetTrigger><SheetContent className="w-[min(22rem,calc(100vw-1rem))] p-5"><SheetHeader className="p-0"><SheetTitle className="text-left"><Brand /></SheetTitle></SheetHeader><nav aria-label="Mobile navigation" className="mt-8 flex flex-col gap-1">{links.map((link) => <SheetClose asChild key={link.href}><Link href={link.href} className="rounded-xl px-4 py-3 text-base font-medium transition hover:bg-muted">{link.label}</Link></SheetClose>)}</nav><div className="mt-auto border-t border-border pt-5">{mounted && session?.user ? <div className="space-y-2"><Button variant="outline" className="w-full rounded-xl" asChild><Link href="/dashboard">Go to dashboard</Link></Button><Button variant="ghost" className="w-full rounded-xl text-destructive" onClick={handleSignOut}>Sign out</Button></div> : <Button className="w-full rounded-xl bg-foreground text-background" asChild><Link href="/sign-in">Get started</Link></Button>}</div></SheetContent></Sheet></div>
      </nav>
    </header>
  );
}
