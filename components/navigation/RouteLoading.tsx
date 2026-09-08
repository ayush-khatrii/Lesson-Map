// Only used while the root route tree loads. Each page has its own skeleton.
export default function RouteLoading() {
  return (
    <div role="status" aria-live="polite" className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <span className="sr-only">Loading LessonMap</span>
      <div aria-hidden="true" className="h-1 w-full rounded-full bg-muted motion-safe:animate-pulse" />
    </div>
  );
}
