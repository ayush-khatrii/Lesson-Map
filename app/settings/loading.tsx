function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />;
}

export default function LoadingSettings() {
  return (
    <main aria-busy="true" aria-label="Loading account settings" className="min-h-screen bg-background pb-12 pt-24 sm:pt-28">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2"><Bar className="h-8 w-56" /><Bar className="h-4 w-72 max-w-full" /></div>
          <Bar className="h-8 w-40" />
        </header>
        <Bar className="mt-5 h-10 w-full max-w-sm" />
        <section className="mt-4 overflow-hidden rounded-lg border border-border">
          <div className="flex items-center gap-3 p-4 sm:p-5">
            <Bar className="size-10" />
            <div className="min-w-0 space-y-2"><Bar className="h-5 w-40" /><Bar className="h-3 w-56 max-w-full" /><Bar className="h-3 w-28" /></div>
          </div>
          <div className="grid grid-cols-2 border-t border-border sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => <div key={index} className="space-y-2 p-3 sm:p-4"><Bar className="h-3 w-16" /><Bar className="h-5 w-10" /></div>)}
          </div>
        </section>
        {[1, 3].map((fields) => (
          <section key={fields} className="mt-4 grid gap-4 rounded-lg border border-border p-4 sm:p-5 md:grid-cols-[200px_minmax(0,1fr)] md:gap-6">
            <div className="space-y-2"><Bar className="h-4 w-28" /><Bar className="h-3 w-44" /></div>
            <div className="space-y-4">
              {Array.from({ length: fields }, (_, index) => <div key={index} className="space-y-2"><Bar className="h-3 w-24" /><Bar className="h-10 w-full" /></div>)}
              <Bar className="h-9 w-36" />
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
