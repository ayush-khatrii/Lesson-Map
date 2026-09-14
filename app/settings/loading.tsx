function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className}`} />;
}

export default function LoadingSettings() {
  return (
    <main aria-busy="true" aria-label="Loading account settings" className="min-h-screen bg-background pb-16 pt-24 sm:pt-28">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-5 border-b border-border/70 pb-8 sm:flex-row sm:items-end sm:justify-between"><div className="space-y-3"><Bar className="h-3 w-32" /><Bar className="h-10 w-52" /><Bar className="h-4 w-80 max-w-full" /></div><Bar className="h-10 w-40" /></header>
        <section className="mt-8 overflow-hidden rounded-2xl border border-border/80 bg-card"><div className="flex items-center gap-4 p-6 sm:p-8"><Bar className="size-12 rounded-2xl" /><div className="space-y-2"><Bar className="h-6 w-40" /><Bar className="h-4 w-56 max-w-full" /><Bar className="h-3 w-28" /></div></div><div className="grid grid-cols-2 border-t border-border/70 sm:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="border-b border-border/70 p-4 sm:border-b-0 sm:[&:not(:first-child)]:border-l"><Bar className="size-4" /><Bar className="mt-4 h-7 w-10" /><Bar className="mt-2 h-3 w-14" /></div>)}</div></section>
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)]"><section className="rounded-2xl border border-border/80 bg-card p-6 sm:p-8"><Bar className="h-6 w-36" /><Bar className="mt-3 h-4 w-64 max-w-full" /><Bar className="mt-8 h-3 w-24" /><Bar className="mt-2 h-11 w-full" /><Bar className="mt-6 h-10 w-32" /></section><aside className="rounded-2xl border border-border/80 bg-muted/20 p-6 sm:p-8"><Bar className="size-10 rounded-xl" /><Bar className="mt-5 h-3 w-24" /><Bar className="mt-3 h-7 w-16" /><Bar className="mt-4 h-4 w-full" /><Bar className="mt-2 h-4 w-4/5" /><Bar className="mt-6 h-10 w-full" /></aside></div>
        <section className="mt-6 rounded-2xl border border-border/80 bg-card"><div className="border-b border-border/70 p-6 sm:px-8"><Bar className="h-6 w-36" /><Bar className="mt-2 h-4 w-72 max-w-full" /></div><div className="space-y-5 p-6">{Array.from({ length: 3 }, (_, index) => <div key={index} className="flex items-center justify-between gap-4"><div className="min-w-0 flex-1 space-y-2"><Bar className="h-5 w-48 max-w-full" /><Bar className="h-3 w-3/4" /><Bar className="h-3 w-36" /></div><Bar className="h-9 w-24 shrink-0" /></div>)}</div></section>
      </div>
    </main>
  );
}
