"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { adminReportOptions } from "@/lib/admin/report-options";
import {
  BookOpen,
  ChevronRight,
  CircleDollarSign,
  ExternalLink,
  LayoutGrid,
  LockKeyhole,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  ShieldCheck,
  Tag,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetHeader,
  SheetTrigger,
} from "@/components/ui/sheet";
import ThemeToggle from "@/components/ThemeToggle";
import { adminAuthClient, adminFetch } from "@/lib/admin/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const AdminIdentity = createContext({
  id: "",
  name: "",
  email: "",
  role: "ADMIN",
});
export const useAdminIdentity = () => useContext(AdminIdentity);
const navigation = [
  { label: "Overview", href: "/dashboard/admin", icon: LayoutGrid },
  { label: "Users", href: "/dashboard/admin/users", icon: Users },
  { label: "Content", href: "/dashboard/admin/content", icon: BookOpen },
  {
    label: "Revenue",
    href: "/dashboard/admin/revenue",
    icon: CircleDollarSign,
  },
  { label: "Discounts", href: "/dashboard/admin/discounts", icon: Tag },
  { label: "Settings", href: "/dashboard/admin/settings", icon: Settings2 },
];

type ShellProps = {
  children: ReactNode;
  user: { id: string; name: string; email: string; role: string };
};

export function AdminShell(props: ShellProps) {
  return <AdminQueryScope key={props.user.id} {...props} />;
}

function AdminQueryScope(props: ShellProps) {
  const [client] = useState(() => new QueryClient());
  useEffect(() => () => client.clear(), [client]);
  return (
    <QueryClientProvider client={client}>
      <AdminShellContent {...props} />
    </QueryClientProvider>
  );
}

function AdminShellContent({
  children,
  user,
}: {
  children: ReactNode;
  user: { id: string; name: string; email: string; role: string };
}) {
  const path = usePathname(),
    router = useRouter(),
    queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(false),
    [mobile, setMobile] = useState(false),
    [signingOut, setSigningOut] = useState(false);
  const current = navigation.find((n) => n.href === path)?.label ?? "Dashboard";
  useEffect(() => {
    try {
      setCollapsed(
        localStorage.getItem("lessonmap-admin-sidebar") === "collapsed",
      );
    } catch {
      /* Storage may be disabled. */
    }
  }, []);
  useEffect(() => {
    let lastActivity = Date.now(),
      changed = false;
    const onActivity = () => {
      lastActivity = Date.now();
      changed = true;
    };
    const events = ["pointerdown", "keydown", "touchstart"] as const;
    events.forEach((event) =>
      window.addEventListener(event, onActivity, { passive: true }),
    );
    const timer = window.setInterval(() => {
      if (Date.now() - lastActivity >= 30 * 60000) {
        queryClient.clear();
        window.location.assign("/dashboard/admin/verify");
        return;
      }
      if (changed && document.visibilityState === "visible") {
        changed = false;
        void adminFetch("/api/admin/activity", {
          method: "POST",
          body: "{}",
        }).catch(() => {});
      }
    }, 60000);
    return () => {
      window.clearInterval(timer);
      events.forEach((event) => window.removeEventListener(event, onActivity));
    };
  }, [queryClient]);
  async function signOut() {
    setSigningOut(true);
    try {
      await adminFetch("/api/admin/security/logout", {
        method: "POST",
        body: "{}",
      });
      await adminAuthClient.signOut();
      queryClient.clear();
      window.location.assign("/dashboard/admin/login");
    } catch {
      toast.error("Unable to sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }
  async function lock() {
    try {
      await adminFetch("/api/admin/security/lock", {
        method: "POST",
        body: "{}",
      });
      queryClient.clear();
      window.location.assign("/dashboard/admin/verify");
    } catch {
      toast.error("Unable to lock the dashboard. Please try again.");
    }
  }
  function toggleSidebar() {
    setCollapsed((value) => {
      try {
        localStorage.setItem(
          "lessonmap-admin-sidebar",
          value ? "expanded" : "collapsed",
        );
      } catch {
        /* Sidebar preferences are optional. */
      }
      return !value;
    });
  }
  function prefetch(href: string) {
    router.prefetch(href);
    const resource =
      href === "/dashboard/admin"
        ? "overview"
        : href.endsWith("/settings")
          ? "access"
          : href.split("/").at(-1)!;
    void queryClient.prefetchQuery(adminReportOptions(resource));
  }
  const links = (compact = false) => (
    <nav aria-label="Business dashboard" className="space-y-1 px-2">
      {navigation.map(({ label, href, icon: Icon }, index) => (
        <div key={href}>
          {index === 5 && <div className="mx-2 my-4 border-t" />}
          <Link
            prefetch={false}
            onPointerEnter={() => prefetch(href)}
            onFocus={() => prefetch(href)}
            onPointerDown={() => prefetch(href)}
            onClick={() => setMobile(false)}
            title={compact ? label : undefined}
            href={href}
            aria-current={path === href ? "page" : undefined}
            className={cn(
              "flex h-9 items-center gap-2.5 rounded-md px-3 text-xs font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              path === href
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground",
              compact && "justify-center px-0",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {!compact && label}
          </Link>
        </div>
      ))}
    </nav>
  );
  return (
    <AdminIdentity.Provider value={user}>
      <div className="admin-workspace min-h-svh bg-background text-foreground">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 hidden flex-col border-r bg-sidebar transition-[width] duration-150 lg:flex",
            collapsed ? "w-16" : "w-56",
          )}
        >
          <div
            className={cn(
              "flex h-14 items-center gap-2.5 border-b px-4",
              collapsed && "justify-center px-0",
            )}
          >
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <BookOpen className="size-4" />
            </div>
            {!collapsed && (
              <>
                <span className="text-sm font-semibold tracking-tight">
                  LessonMap
                </span>
                <span className="ml-auto rounded border px-1 py-0.5 text-[9px] font-medium text-muted-foreground">
                  ADMIN
                </span>
              </>
            )}
          </div>
          {!collapsed && (
            <p className="px-5 pb-2 pt-5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Business workspace
            </p>
          )}
          <div className={cn("flex-1", collapsed && "pt-4")}>
            {links(collapsed)}
          </div>
          <div className="space-y-1 border-t p-2">
            <Link
              href="/dashboard"
              title="Creator workspace"
              className={cn(
                "flex h-9 items-center gap-2 rounded-md px-3 text-xs text-muted-foreground hover:bg-muted",
                collapsed && "justify-center px-0",
              )}
            >
              <ExternalLink className="size-4" />
              {!collapsed && "Creator workspace"}
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-9 w-full justify-start text-xs text-muted-foreground",
                collapsed && "justify-center px-0",
              )}
              onClick={toggleSidebar}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <PanelLeftOpen className="size-4" />
              ) : (
                <>
                  <PanelLeftClose className="size-4" />
                  Collapse sidebar
                </>
              )}
            </Button>
          </div>
          <div
            className={cn(
              "flex items-center gap-2 border-t p-3",
              collapsed && "justify-center",
            )}
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{user.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {user.role === "SUPER_ADMIN"
                    ? "Super admin"
                    : "Administrator"}
                </p>
              </div>
            )}
          </div>
        </aside>
        <div
          className={cn(
            "min-h-svh transition-[padding] duration-150",
            collapsed ? "lg:pl-16" : "lg:pl-56",
          )}
        >
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b bg-background px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <Sheet open={mobile} onOpenChange={setMobile}>
                <SheetTrigger asChild>
                  <Button
                    className="size-8 lg:hidden"
                    size="icon"
                    variant="ghost"
                    aria-label="Open sidebar"
                  >
                    <Menu className="size-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 px-0">
                  <SheetHeader className="border-b px-5 pb-4">
                    <SheetTitle className="text-left text-sm">
                      LessonMap{" "}
                      <span className="font-normal text-muted-foreground">
                        Business
                      </span>
                    </SheetTitle>
                  </SheetHeader>
                  <div className="pt-4">{links()}</div>
                  <Link
                    className="mt-8 flex items-center gap-2 px-5 text-xs text-muted-foreground"
                    href="/dashboard"
                  >
                    <ExternalLink className="size-4" />
                    Creator workspace
                  </Link>
                </SheetContent>
              </Sheet>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                Business
              </span>
              <ChevronRight className="hidden size-3 text-muted-foreground sm:block" />
              <span className="text-xs font-medium">{current}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="mr-2 hidden items-center gap-1.5 text-[11px] text-muted-foreground md:flex">
                <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                Private workspace
              </span>
              <ThemeToggle />
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => void lock()}
                aria-label="Lock dashboard"
              >
                <LockKeyhole className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => void signOut()}
                disabled={signingOut}
                aria-label="Sign out of admin"
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          </header>
          <section className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6">
            {children}
          </section>
          <footer className="flex flex-wrap justify-between gap-2 border-t px-6 py-3 text-[10px] text-muted-foreground">
            <span>LessonMap · Business dashboard</span>
            <span>Financial amounts include tax · Asia/Kolkata</span>
          </footer>
        </div>
      </div>
    </AdminIdentity.Provider>
  );
}
