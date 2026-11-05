"use client";
import type { FormEvent } from "react";
import { ArrowDownUp, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ContentRow, Paged } from "@/lib/admin/contracts";
import {
  PageHeading,
  Panel,
  TableFrame,
  Pager,
  Empty,
  ErrorState,
  LoadingState,
  Bool,
  displayDate,
  useAdminReport,
  useAdminParams,
  selectClass,
} from "./Shared";
export function ContentView() {
  const query = useAdminReport<Paged<ContentRow>>("content"),
    { params, set, reset } = useAdminParams();
  function search(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    set({ q: String(new FormData(e.currentTarget).get("q") ?? "") });
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
  return (
    <>
      <PageHeading
        title="Content"
        description="Explore the courses, modules, and lessons your creators are building."
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
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <form
            key={params.get("q") ?? ""}
            onSubmit={search}
            className="flex items-center gap-2"
          >
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                aria-label="Search courses or creators"
                name="q"
                placeholder="Search course or creator…"
                defaultValue={params.get("q") ?? ""}
                className="w-60 pl-8 text-xs"
              />
            </div>
            <Button size="sm" variant="outline">
              Search
            </Button>
          </form>
          <select
            aria-label="Published filter"
            className={selectClass}
            value={params.get("published") ?? "all"}
            onChange={(e) => set({ published: e.target.value })}
          >
            <option value="all">All publication states</option>
            <option value="true">Published</option>
            <option value="false">Unpublished</option>
          </select>
          <select
            aria-label="Visibility filter"
            className={selectClass}
            value={params.get("public") ?? "all"}
            onChange={(e) => set({ public: e.target.value })}
          >
            <option value="all">All visibility</option>
            <option value="true">Public</option>
            <option value="false">Private</option>
          </select>
          {params.size > 0 && (
            <Button size="sm" variant="ghost" onClick={reset}>
              Reset
            </Button>
          )}
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
                      {[
                        { label: "Course", sort: "courseName" },
                        { label: "Creator" },
                        { label: "Modules", sort: "modules" },
                        { label: "Lessons", sort: "lessons" },
                        { label: "Public" },
                        { label: "Published" },
                        { label: "Created", sort: "createdAt" },
                      ].map((c) => (
                        <th key={c.label}>
                          {c.sort ? (
                            <button
                              onClick={() => sort(c.sort!)}
                              className="inline-flex items-center gap-1.5 rounded focus-visible:ring-2 focus-visible:ring-ring"
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
                    {query.data.data.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <p
                            className="max-w-72 truncate font-medium"
                            title={c.courseName}
                          >
                            {c.courseName}
                          </p>
                        </td>
                        <td>
                          <p>{c.name}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {c.email}
                          </p>
                        </td>
                        <td className="tabular-nums">{c.modules}</td>
                        <td className="tabular-nums">{c.lessons}</td>
                        <td>
                          <Bool value={c.isPublic} />
                        </td>
                        <td>
                          <Bool value={c.isPublished} />
                        </td>
                        <td className="text-muted-foreground">
                          {displayDate(c.createdAt)}
                        </td>
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
