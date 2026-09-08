"use client";

export default function ErrorPage({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      className="mx-auto grid min-h-screen w-full max-w-md place-items-center bg-oat/90 px-5 py-10 shadow-soft"
      id="main-content"
    >
      <section className="rounded-lg bg-white/85 p-5 shadow-soft ring-1 ring-white/70">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-tomato">Something went wrong</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">The app could not load this view</h1>
        <p className="mt-3 text-sm leading-6 text-ink/65">
          Your saved data is still in Supabase. Try loading the page again.
        </p>
        {error.digest ? <p className="mt-2 text-xs text-ink/45">Error id: {error.digest}</p> : null}
        <button
          className="mt-5 min-h-12 w-full rounded-md bg-gradient-to-r from-rose via-lilac to-aqua px-4 text-sm font-semibold text-ink shadow-sm"
          onClick={reset}
          type="button"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
