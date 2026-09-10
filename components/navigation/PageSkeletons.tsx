import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { plans, comparisonRows, exampleCourses } from "@/constants";

const container = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("h-4 rounded-md bg-muted motion-safe:animate-pulse", className)} />;
}

function LoadingRegion({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

function Actions() {
  return <div className="flex gap-2"><Skeleton className="h-8 w-24" /><Skeleton className="h-8 w-28" /></div>;
}

function Lines({ count = 3 }: { count?: number }) {
  return <div className="space-y-3">{Array.from({ length: count }, (_, i) => <Skeleton key={i} className={i === count - 1 ? "w-2/3" : "w-full"} />)}</div>;
}

export function DashboardSkeleton() {
  return (
    <LoadingRegion label="Loading your dashboard" className="my-20 min-h-screen bg-background text-foreground">
      <div className={cn(container, "space-y-8 py-8")}>
        <section className="overflow-hidden px-6 py-8 md:px-10">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex w-full flex-col items-center">
              <p className="mb-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">Welcome back</p>
              <Skeleton className="mb-1 h-8 w-60 max-w-full md:h-12 md:w-80" />
              <Skeleton className="h-5 w-full max-w-sm" />
              <Skeleton className="mt-3 h-4 w-full max-w-md" />
            </div>
            <Actions />
          </div>
        </section>
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {["Total Courses", "Total Modules", "Total Lessons", "Avg. Lessons/Module"].map(label => (
            <div key={label} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-9 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-[18px] w-8" />
                  <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                  <Skeleton className="mt-0.5 h-[15px] w-20 max-w-full" />
                </div>
              </div>
            </div>
          ))}
        </section>
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3"><h2 className="text-lg font-semibold">Your Courses</h2><Skeleton className="h-5 w-6" /></div>
            <Skeleton className="h-8 w-28" />
          </div>
          <div className="space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-4 rounded-2xl border border-border px-6 py-5">
                <Skeleton className="size-11 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-5 w-full max-w-xs" /><Skeleton className="h-3 w-full max-w-lg" /></div>
                <div className="hidden items-center gap-4 md:flex"><Skeleton className="w-20" /><Skeleton className="w-20" /><Skeleton className="w-16" /></div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </LoadingRegion>
  );
}

export function PricingSkeleton() {
  return (
    <LoadingRegion label="Loading pricing" className="relative pb-10 pt-24">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <div className="mx-auto mb-6 max-w-xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-primary sm:text-4xl">A plan for your next course</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Start free. Choose Creator when you need more.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map(plan => (
            <div key={plan.name} className={cn("flex flex-col gap-4 rounded-2xl border bg-transparent px-5 py-5", plan.isPopular ? "border-primary" : "border-border")}>
              <div className="space-y-3">
                <div>
                  <div className="flex min-h-7 items-center justify-between gap-2"><h2 className="text-xl font-semibold tracking-tight">{plan.name}</h2><Skeleton className="h-5 w-24 rounded-full" /></div>
                  <p className="mt-2 text-sm leading-5 text-muted-foreground">{plan.description}</p>
                </div>
                <Skeleton className="h-10 w-28" />
              </div>
              <div className="flex-1 space-y-2 border-t border-border pt-4">
                {plan.features.map(feature => <div key={feature} className="flex items-start gap-2"><Skeleton className="mt-0.5 size-4 shrink-0" /><span className="text-sm leading-5 text-muted-foreground">{feature}</span></div>)}
              </div>
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
        <section className="mt-8 rounded-2xl border border-border p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Feature comparison</p>
          <Skeleton className="mb-6 mt-2 h-8 w-80 max-w-full" />
          <div className="overflow-hidden rounded-2xl border border-border">
            <div className="grid grid-cols-3 gap-4 bg-muted/40 px-4 py-3 text-sm font-medium"><span>Feature</span><span>Free</span><span>Creator</span></div>
            {comparisonRows.map(row => <div key={row.label} className="grid grid-cols-3 gap-4 border-t border-border px-4 py-4"><span className="text-sm">{row.label}</span><Skeleton /><Skeleton /></div>)}
          </div>
        </section>
      </div>
    </LoadingRegion>
  );
}

export function ExamplesSkeleton() {
  return (
    <LoadingRegion label="Loading examples" className="mt-10 min-h-screen bg-background text-foreground">
      <div className={cn(container, "space-y-8 py-10")}>
        <section className="rounded-2xl border border-border bg-card px-6 py-10 text-center md:px-12">
          <span className="mb-4 inline-flex rounded-full bg-secondary px-4 py-1 text-xs">Ready-to-use Templates</span>
          <h1 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">Start Faster with a Template</h1>
          <p className="mx-auto mb-6 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">Browse professionally structured course outlines. Pick one that fits your topic, customize it, and start teaching — in minutes.</p>
          <Skeleton className="mx-auto h-10 w-full max-w-md rounded-xl" />
        </section>
        <div className="flex items-center gap-2"><h2 className="text-base font-semibold">All Templates</h2><Skeleton className="h-5 w-7" /></div>
        <div className="space-y-3">
          {exampleCourses.map(course => (
            <div key={course.id} className="rounded-2xl border border-border bg-card px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-3 w-full" /></div>
                <Skeleton className="hidden h-5 w-28 sm:block" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/20 px-8 py-8 text-center"><Skeleton className="size-10 rounded-xl" /><p className="font-semibold">Don\u0027t see what you need?</p><Skeleton className="h-8 w-64 max-w-full" /><Actions /></div>
      </div>
    </LoadingRegion>
  );
}

export function EditorSkeleton({ editing = false }: { editing?: boolean }) {
  return (
    <LoadingRegion label={editing ? "Opening course editor" : "Loading course builder"} className="min-h-screen bg-background text-foreground">
      <div className={cn(container, "py-8 sm:py-10")}>
        <div className="mb-8 mt-16">
          <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-center gap-3"><Skeleton className="size-9 rounded-xl" /><div><p className="mb-0.5 text-xs text-muted-foreground">Dashboard / {editing ? "Edit Course" : "Course Builder"}</p>{editing ? <Skeleton className="h-7 w-52" /> : <h1 className="text-xl font-bold">New Course</h1>}</div></div><Actions /></div>
          {editing && <div className="mt-5 flex gap-2">{[0, 1, 2].map(i => <Skeleton key={i} className="h-6 w-24 rounded-full" />)}</div>}
        </div>
        <div className="mb-6 space-y-4 rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{editing ? "Course" : "Course Details"}</p>
          {editing ? <><Skeleton className="h-7 w-72 max-w-full" /><Lines count={2} /></> : <><p className="text-sm font-medium">Title</p><Skeleton className="h-10 w-full" /><p className="text-sm font-medium">Description</p><Skeleton className="h-24 w-full" /></>}
        </div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div className="flex max-w-full flex-wrap gap-3 rounded-lg border border-border bg-muted/50 p-2 text-xs"><span>Outline</span><span>Resources</span><span>Settings</span><span>Share</span></div><Skeleton className="h-9 w-44" /></div>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-base font-semibold">Modules</h2><Skeleton className="h-8 w-28" /></div>
        {editing ? <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="flex items-center gap-3 rounded-xl border border-border p-5"><Skeleton className="size-8" /><Skeleton className="h-5 w-2/3" /></div>)}</div> : <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border py-12"><Skeleton className="size-10 rounded-xl" /><Skeleton className="h-5 w-56 max-w-full" /><Skeleton className="h-9 w-32" /></div>}
      </div>
    </LoadingRegion>
  );
}

export function OutlineSkeleton() {
  return (
    <LoadingRegion label="Loading course outline" className={cn(container, "space-y-6 py-20")}>
      <div className="space-y-6">
        <div className="space-y-2"><Skeleton className="h-9 w-96 max-w-full" /><Skeleton className="h-6 w-2/3" /></div>
        <Skeleton className="h-9 w-full" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="space-y-2">{[0, 1, 2].map(i => <div key={i} className="space-y-3 rounded-lg border border-border p-4"><Skeleton className="h-5 w-20" /><Lines count={2} /></div>)}</div>
          <div className="space-y-6 rounded-lg border border-border p-6 md:col-span-2"><Skeleton className="h-7 w-2/3" /><Lines />{[0, 1, 2].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
        </div>
      </div>
    </LoadingRegion>
  );
}

export function PublicCourseSkeleton() {
  return (
    <LoadingRegion label="Loading shared course" className="min-h-screen bg-zinc-950 text-white [&_.bg-muted]:bg-zinc-800">
      <div className="border-b border-zinc-800"><div className={cn(container, "flex items-center justify-between py-4")}><div className="flex items-center gap-2.5"><Skeleton className="size-8 rounded-lg" /><span className="font-bold">LessonMap</span></div><Skeleton className="size-8 rounded-full" /></div></div>
      <div className={cn(container, "py-8")}>
        <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
          <div className="space-y-3 border-b border-zinc-800 px-6 py-6 md:px-8"><p className="text-xs font-bold uppercase tracking-wide text-amber-400">Public Course</p><Skeleton className="h-9 w-2/3" /><Lines count={2} /></div>
          <div className="grid grid-cols-2 gap-3 border-b border-zinc-800 px-6 py-5 md:grid-cols-4 md:px-8">{["Modules", "Lessons", "Content", "Students"].map(label => <div key={label} className="space-y-2 rounded-2xl border border-zinc-800 p-4"><Skeleton className="h-7 w-12" /><p className="text-xs text-zinc-500">{label}</p></div>)}</div>
          <div className="space-y-2 border-b border-zinc-800 px-6 py-4 md:px-8"><p className="text-sm font-semibold">Your progress</p><Skeleton className="h-2 w-full" /><Skeleton className="h-3 w-48" /></div>
          <div className="px-6 py-6 md:px-8"><div className="mb-5 flex items-center justify-between"><h2 className="text-base font-bold">Course curriculum</h2><Skeleton className="h-9 w-28" /></div><div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(280px,340px)_1fr]"><div className="space-y-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div><div className="min-h-80 space-y-6 rounded-2xl border border-zinc-800 p-6"><Skeleton className="h-7 w-2/3" /><Lines count={5} /></div></div></div>
          <div className="flex items-start gap-4 border-t border-zinc-800 px-6 py-5 md:px-8"><Skeleton className="size-12 shrink-0 rounded-2xl" /><div className="w-48 space-y-2"><p className="text-xs text-zinc-500">Course creator</p><Lines count={2} /></div></div>
        </div>
      </div>
    </LoadingRegion>
  );
}

export function SettingsSkeleton() {
  return (
    <LoadingRegion label="Loading settings" className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border"><div className={cn(container, "flex h-14 items-center justify-between")}><span className="text-sm font-bold">LessonMap <span className="font-normal text-muted-foreground">/ Settings</span></span><Skeleton className="size-7 rounded-full" /></div></div>
      <div className={cn(container, "py-8")}>
        <Skeleton className="mb-6 h-16 w-full md:hidden" />
        <div className="flex gap-8">
          <aside className="hidden w-52 shrink-0 flex-col gap-2 md:flex"><div className="mb-4 flex flex-col items-center gap-3 rounded-xl border border-border p-4"><Skeleton className="size-16 rounded-full" /><Skeleton className="w-28" /></div>{["Profile", "Notifications", "Security", "Appearance", "Billing", "Integrations"].map(label => <div key={label} className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground">{label}</div>)}</aside>
          <div className="min-w-0 flex-1"><div className="mb-6"><h1 className="text-2xl font-bold">Profile</h1><p className="mt-1 text-sm text-muted-foreground">Manage your public presence and personal information.</p></div><div className="space-y-6 rounded-xl border border-border bg-card p-6"><div className="flex items-center gap-4"><Skeleton className="size-20 rounded-full" /><Skeleton className="h-9 w-28" /></div><div className="grid gap-6 sm:grid-cols-2">{[0, 1, 2, 3].map(i => <div key={i} className="space-y-2"><Skeleton className="w-24" /><Skeleton className="h-9 w-full" /></div>)}</div><Skeleton className="h-24 w-full" /><Skeleton className="h-9 w-28" /></div></div>
        </div>
      </div>
    </LoadingRegion>
  );
}

export function SignInFormSkeleton() {
  return (
    <LoadingRegion label="Loading sign-in options" className="flex flex-col gap-6">
      <h1 className="text-center text-2xl md:text-4xl">Sign in to <span className="font-bold">LessonMap</span></h1>
      <p className="my-3 text-center text-lg md:text-xl">Build beautiful course outlines in minutes</p>
      <Skeleton className="mt-5 h-9 w-full" />
    </LoadingRegion>
  );
}

export function SignInSkeleton() {
  return <div className="min-h-svh bg-background"><div className={cn(container, "flex min-h-svh items-center justify-center py-10")}><div className="w-full max-w-sm"><SignInFormSkeleton /></div></div></div>;
}

export function LandingSkeleton() {
  return (
    <LoadingRegion label="Loading LessonMap" className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 pb-20 pt-32 sm:pt-40 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:px-8 lg:pt-44">
      <div>
        <Skeleton className="h-4 w-64 max-w-full" />
        <div className="mt-7 space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-4/5" />
          <Skeleton className="h-14 w-3/5" />
        </div>
        <div className="mt-7 max-w-md"><Lines /></div>
        <div className="mt-8 flex flex-wrap gap-5"><Skeleton className="h-11 w-40" /><Skeleton className="h-11 w-32" /></div>
      </div>
      <div className="rounded-xl border border-border p-7">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-8 h-7 w-3/4" />
        <Skeleton className="mt-3 h-4 w-full" />
        <div className="mt-8 space-y-5">{[0, 1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      </div>
    </LoadingRegion>
  );
}

export function AuthErrorSkeleton() {
  return <LoadingRegion label="Loading sign-in help" className={cn(container, "py-24")}><Skeleton className="h-6 w-56 max-w-full" /></LoadingRegion>;
}
