"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Menu, LogOut, User, Settings, Moon, Sun } from "lucide-react";
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

const NavbarItem = ({ item, href }: { item: string; href: string }) => {
  const pathName = usePathname();

  return (
    <Link
      href={href}
      className={cn(
        "relative text-sm font-medium transition-colors hover:text-foreground/80",
        pathName === href ? "text-foreground" : "text-foreground/60",
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
            <span>Profile</span>
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
            Profile
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
        "fixed inset-x-0 top-0 z-40 border-b border-border/70 bg-background/90 shadow-sm backdrop-blur-xl md:px-5",
        className,
      )}
    >
      <nav className="container mx-auto flex h-16 max-w-screen-2xl items-center px-4 py-2">
        <div className="mr-4 flex">
          <Link href="/" className="flex items-center">
            <span className="font-bold text-xl">LessonMap</span>
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
                  <UserProfileDropdown
                    user={session.user}
                    onSignOut={handleSignOut}
                  />
                ) : (
                  <Button size="sm" asChild>
                    <Link href="/sign-in">Get Started</Link>
                  </Button>
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
                className="h-dvh w-[min(22rem,calc(100vw-1rem))] overflow-y-auto px-3 py-4"
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
                      <MobileUserSection
                        user={session.user}
                        onSignOut={handleSignOut}
                      />
                    ) : (
                      <SheetClose asChild>
                        <Button className="w-full" asChild>
                          <Link href="/sign-in">Get Started</Link>
                        </Button>
                      </SheetClose>
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
