"use client";
import { useEffect, useState, type FormEvent } from "react";
import {
  RefreshCw,
  ArrowDownUp,
  Columns3,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Paged, UserRow } from "@/lib/admin/contracts";
import {
  PageHeading,
  LoadingState,
  ErrorState,
  Panel,
  Pager,
  TableFrame,
  Empty,
  Bool,
  integer,
  useAdminReport,
  useAdminParams,
  selectClass,
} from "./Shared";
import { useAdminIdentity } from "./AdminShell";

const columns: {
  key: Exclude<keyof UserRow, "id">;
  label: string;
  sort?: string;
}[] = [
  { key: "name", label: "Name", sort: "name" },
  { key: "email", label: "Email", sort: "email" },
  { key: "courses", label: "Courses", sort: "courses" },
  { key: "modules", label: "Modules", sort: "modules" },
  { key: "lessons", label: "Lessons", sort: "lessons" },
  {
    key: "publishedCourses",
    label: "Published courses",
    sort: "publishedCourses",
  },
  { key: "isPaid", label: "Paid" },
  { key: "isActive", label: "Active subscription" },
  { key: "isFree", label: "Free plan" },
  { key: "isCreator", label: "Creator plan" },
  { key: "isProfessional", label: "Professional plan" },
  { key: "cancelling", label: "Cancellation scheduled" },
  { key: "emailVerified", label: "Email verified" },
  {
    key: "accountAgeDays",
    label: "Account age (days)",
    sort: "accountAgeDays",
  },
];
const defaults = [
  "name",
  "email",
  "courses",
  "modules",
  "lessons",
  "isPaid",
  "isActive",
];
const filterKeys = [
  "plan",
  "paid",
  "active",
  "cancelling",
  "verified",
  "minCourses",
  "maxCourses",
  "joinedFrom",
  "joinedTo",
];

export function UsersView() {
  const query = useAdminReport<Paged<UserRow>>("users"),
    { params, set, reset } = useAdminParams(),
    identity = useAdminIdentity();
  const [visible, setVisible] = useState<string[]>(defaults),
    [filtersOpen, setFiltersOpen] = useState(false);
  const storageKey = `lessonmap-admin-columns-v1:${identity.id}`;
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (Array.isArray(saved))
        setVisible([
          ...new Set([
            "name",
            "email",
            ...saved.filter((k) => columns.some((c) => c.key === k)),
          ]),
        ]);
    } catch {
      /* Browsers may disable local storage. */
    }
  }, [storageKey]);
  function toggle(key: string) {
    setVisible((old) => {
      const value = old.includes(key)
        ? old.filter((k) => k !== key)
        : [...old, key];
      try {
        localStorage.setItem(storageKey, JSON.stringify(value));
      } catch {}
      return value;
    });
  }
  function search(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    set({ q: String(new FormData(e.currentTarget).get("q") ?? "") });
  }
  function apply(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    set(
      Object.fromEntries(
        filterKeys.map((key) => [key, String(form.get(key) ?? "")]),
      ),
    );
    setFiltersOpen(false);
  }
  function sort(key: string) {
    set({
      sort: key,
      direction:
        params.get("sort") === key && params.get("direction") !== "asc"
          ? "asc"
          : "desc",
    });
  }
  const active = filterKeys.filter((key) => params.has(key)).length;
  const shown = columns.filter((c) => visible.includes(c.key));
  const booleanFilter = (name: string, label: string) => (
    <div className="space-y-2">
      <Label htmlFor={`filter-${name}`}>{label}</Label>
      <select
        id={`filter-${name}`}
        name={name}
        defaultValue={params.get(name) ?? "all"}
        className={`${selectClass} w-full`}
      >
        <option value="all">All users</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    </div>
  );
  return (
    <>
      <PageHeading
        title="Users"
        description="Understand your audience, subscription mix, and creator activity."
      />
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          disabled={query.isFetching}
          onClick={() => void query.refresh().catch(() => {})}
        >
          <RefreshCw
            className={`size-3.5 ${query.isFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>
      <Panel borderless busy={query.isFetching}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
          <form
            key={params.get("q") ?? ""}
            onSubmit={search}
            className="flex items-center gap-2"
          >
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                aria-label="Search users"
                placeholder="Search name or email…"
                name="q"
                defaultValue={params.get("q") ?? ""}
                className="w-56 pl-8 text-xs sm:w-64"
              />
            </div>
            <Button size="sm" variant="outline">
              Search
            </Button>
          </form>
          <div className="flex flex-wrap items-center gap-2">
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <SlidersHorizontal className="size-3.5" />
                  Filters
                  {active > 0 && (
                    <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                      {active}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full overflow-y-auto sm:max-w-sm">
                <SheetHeader>
                  <SheetTitle className="text-base">Filter users</SheetTitle>
                  <SheetDescription className="text-xs">
                    Combine filters to inspect a specific audience.
                  </SheetDescription>
                </SheetHeader>
                <form onSubmit={apply} className="space-y-4 px-4 pb-6">
                  <div className="space-y-2">
                    <Label htmlFor="filter-plan">Effective plan</Label>
                    <select
                      id="filter-plan"
                      name="plan"
                      className={`${selectClass} w-full`}
                      defaultValue={params.get("plan") ?? "all"}
                    >
                      <option value="all">All plans</option>
                      <option value="FREE">Free</option>
                      <option value="CREATOR">Creator</option>
                      <option value="PROFESSIONAL">Professional</option>
                    </select>
                  </div>
                  {booleanFilter("paid", "Paid user")}
                  {booleanFilter("active", "Active paid subscription")}
                  {booleanFilter("cancelling", "Cancellation scheduled")}
                  {booleanFilter("verified", "Email verified")}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="min-courses">Minimum courses</Label>
                      <Input
                        id="min-courses"
                        name="minCourses"
                        type="number"
                        min="0"
                        defaultValue={params.get("minCourses") ?? ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max-courses">Maximum courses</Label>
                      <Input
                        id="max-courses"
                        name="maxCourses"
                        type="number"
                        min="0"
                        defaultValue={params.get("maxCourses") ?? ""}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="joined-from">Joined from</Label>
                    <Input
                      id="joined-from"
                      name="joinedFrom"
                      type="date"
                      defaultValue={params.get("joinedFrom") ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="joined-to">Joined through</Label>
                    <Input
                      id="joined-to"
                      name="joinedTo"
                      type="date"
                      defaultValue={params.get("joinedTo") ?? ""}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Signup dates use Asia/Kolkata.
                  </p>
                  <Button className="w-full">Apply filters</Button>
                </form>
              </SheetContent>
            </Sheet>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <Columns3 className="size-3.5" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="max-h-96 overflow-y-auto"
              >
                <DropdownMenuLabel className="text-xs">
                  Visible columns
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {columns.map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.key}
                    checked={visible.includes(c.key)}
                    disabled={c.key === "name" || c.key === "email"}
                    onCheckedChange={() => toggle(c.key)}
                    onSelect={(e) => e.preventDefault()}
                    className="text-xs"
                  >
                    {c.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {(active > 0 || params.get("q")) && (
              <Button variant="ghost" size="sm" onClick={reset}>
                <X className="size-3.5" />
                Reset
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between border-b px-4 py-2.5 text-[11px] text-muted-foreground">
          <span>Users</span>
          <span>
            {query.data ? `${integer(query.data.total)} users` : "Loading…"}
          </span>
        </div>
        {query.isRefetchError && query.data && (
          <p role="status" className="text-xs text-destructive">
            Could not refresh. Showing the last loaded results.
          </p>
        )}
        {query.isPending ? (
          <div className="p-4">
            <LoadingState />
          </div>
        ) : query.isError && !query.data ? (
          <ErrorState error={query.error} retry={() => void query.refetch()} />
        ) : (
          query.data && (
            <>
              {query.data.data.length ? (
                <TableFrame>
                  <thead>
                    <tr>
                      {shown.map((c) => (
                        <th
                          key={c.key}
                          aria-sort={
                            params.get("sort") === c.sort
                              ? params.get("direction") === "asc"
                                ? "ascending"
                                : "descending"
                              : undefined
                          }
                        >
                          {c.sort ? (
                            <button
                              onClick={() => sort(c.sort!)}
                              className="inline-flex items-center gap-1.5 rounded outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {c.label}
                              <ArrowDownUp className="size-3" />
                            </button>
                          ) : (
                            c.label
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {query.data.data.map((user) => (
                      <tr key={user.id}>
                        {shown.map((c) => {
                          const value = user[c.key];
                          return (
                            <td
                              key={c.key}
                              className={
                                c.key === "name"
                                  ? "font-medium"
                                  : typeof value === "number"
                                    ? "tabular-nums"
                                    : "text-muted-foreground"
                              }
                            >
                              {typeof value === "boolean" ? (
                                <Bool value={value} />
                              ) : typeof value === "number" ? (
                                integer(value)
                              ) : (
                                value
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </TableFrame>
              ) : (
                <Empty />
              )}
              <Pager {...query.data} disabled={query.isPlaceholderData} />
            </>
          )
        )}
      </Panel>
    </>
  );
}
