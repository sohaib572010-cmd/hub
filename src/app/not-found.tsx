export default function NotFound() {
  return (
    <div className="portfolio flex min-h-dvh flex-col" data-mode="dark" data-accent="mono">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-24">
        <p className="eyebrow mb-6 text-[var(--p-muted)]">404</p>
        <h1 className="display text-[clamp(2.75rem,8vw,5.5rem)]">Nothing here.</h1>
        <p className="mt-6 max-w-md text-lg leading-relaxed text-[var(--p-muted)]">
          The address may be mistyped, or the page may no longer exist.
        </p>
      </main>
    </div>
  );
}
