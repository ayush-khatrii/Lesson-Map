"use client";
import React, { useState } from "react";
import { Menu, LogOut, User, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSession, signOut } from "@/lib/auth-client";
import ThemeToggle from "../ThemeToggle";
import Image from "next/image";

const NavbarItem = ({ item, href }: { item: string; href: string }) => {
  const pathName = usePathname();
  const isActive =
    href === "/"
      ? pathName === "/"
      : pathName === href || pathName.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        "relative text-sm font-medium transition-colors hover:text-foreground/80",
        isActive ? "text-foreground" : "text-foreground/60",
      )}
    >
      {item}
    </Link>
  );
};

const MobileNavItem = ({ item, href }: { item: string; href: string }) => {
  return (
    <SheetClose asChild>
      <Link
        href={href}
        className="block px-4 py-3 text-lg font-medium text-foreground hover:text-primary hover:bg-accent rounded-lg transition-colors"
      >
        {item}
      </Link>
    </SheetClose>
  );
};

const UserProfileDropdown = ({
  user,
  onSignOut,
}: {
  user: { name?: string; email?: string; image?: string | null };
  onSignOut: () => void;
}) => {
  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={user.image || undefined}
              alt={user.name || "User"}
            />
            <AvatarFallback className="text-xs">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user.name || "User"}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email || ""}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-red-600 focus:text-red-600"
          onClick={onSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const MobileUserSection = ({
  user,
  onSignOut,
}: {
  user: { name?: string; email?: string; image?: string | null };
  onSignOut: () => void;
}) => {
  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="mt-8 space-y-4">
      <div className="mx-2 flex items-center gap-3 px-4 py-3 bg-accent rounded">
        <Avatar className="h-12 w-12">
          <AvatarImage
            src={user.image || undefined}
            alt={user.name || "User"}
          />
          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{user.name || "User"}</p>
          <p className="text-xs text-muted-foreground truncate">
            {user.email || ""}
          </p>
        </div>
      </div>
      <SheetClose asChild>
        <Link href="/dashboard">
          <Button variant="ghost" className="w-full justify-start">
            <User className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
        </Link>
      </SheetClose>
      <SheetClose asChild>
        <Link href="/settings">
          <Button variant="ghost" className="w-full justify-start">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </Link>
      </SheetClose>
      <SheetClose asChild>
        <Button
          variant="destructive"
          className="w-full justify-start"
          onClick={onSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </SheetClose>
    </div>
  );
};

export default function Navbar({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session, isPending } = useSession();

  const handleSignOut = async () => {
    await signOut();
  };

  const publicNavItems = [
    { item: "Home", href: "/" },
    { item: "Examples", href: "/examples" },
    { item: "Pricing", href: "/pricing" },
  ];

  const authenticatedNavItems = [
    { item: "Home", href: "/" },
    { item: "Examples", href: "/examples" },
    { item: "Dashboard", href: "/dashboard" },
    { item: "Pricing", href: "/pricing" },
  ];

  const navItems = session?.user ? authenticatedNavItems : publicNavItems;

  return (
    <nav
      className={cn(
        "fixed top-0 z-[999] border-b inset-x-0 shadow-sm bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className,
      )}
    >
      <nav className="mx-auto flex h-14 w-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        <div className="flex shrink-0">
          <Link href="/" aria-label="LessonMap home" className="group inline-flex shrink-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg" aria-hidden="true">
              <Image
                src="/logo.png"
                alt=""
                width={80}
                height={80}
                className="size-20 max-w-none shrink-0 translate-y-1 object-contain transition-transform duration-200 motion-safe:group-hover:scale-[1.03]"
              />
            </span>
            <span className="whitespace-nowrap text-xl font-semibold leading-none tracking-tight">
              Lesson<span className="text-orange-500">Map</span>
            </span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-end">
          <nav className="hidden mr-3 md:flex items-center gap-6 text-sm">
            {navItems.map((nav, index) => (
              <NavbarItem key={index} item={nav.item} href={nav.href} />
            ))}
          </nav>
          <nav className="hidden px-4 md:flex items-center gap-2">
            <ThemeToggle />
            {!isPending && (
              <>
                {session?.user ? (
                  <>
                    <Button size="sm" variant="outline" asChild>
                      <Link href="/dashboard">Dashboard</Link>
                    </Button>
                    <UserProfileDropdown
                      user={session.user}
                      onSignOut={handleSignOut}
                    />
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="ghost" asChild>
                      <Link href="/sign-in">Log in</Link>
                    </Button>
                    <Button size="sm" asChild>
                      <Link href="/sign-in">Get Started</Link>
                    </Button>
                  </>
                )}
              </>
            )}
          </nav>

          <div className="md:hidden flex items-center">
            <ThemeToggle />
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[300px] px-3 py-4 sm:w-[400px] flex flex-col h-full"
              >
                <SheetHeader className="mb-6">
                  <SheetTitle className="text-2xl font-bold text-left">
                    LessonMap
                  </SheetTitle>
                </SheetHeader>

                <nav className="flex-1 flex flex-col space-y-2">
                  {navItems.map((nav, index) => (
                    <MobileNavItem
                      key={index}
                      item={nav.item}
                      href={nav.href}
                    />
                  ))}
                </nav>
                {!isPending && (
                  <div className="mt-auto pt-6 border-t">
                    {session?.user ? (
                      <>
                        <SheetClose asChild>
                          <Button className="w-full mb-3" asChild>
                            <Link href="/dashboard">Go to Dashboard</Link>
                          </Button>
                        </SheetClose>
                        <MobileUserSection
                          user={session.user}
                          onSignOut={handleSignOut}
                        />
                      </>
                    ) : (
                      <div className="space-y-2">
                        <SheetClose asChild>
                          <Button variant="outline" className="w-full" asChild>
                            <Link href="/sign-in">Log in</Link>
                          </Button>
                        </SheetClose>
                        <SheetClose asChild>
                          <Button className="w-full" asChild>
                            <Link href="/sign-in">Get Started</Link>
                          </Button>
                        </SheetClose>
                      </div>
                    )}
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </nav>
  );
}
