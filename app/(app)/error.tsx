"use client";

export default function AppError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="grid min-h-[60vh] place-items-center">
      <div className="rounded-lg bg-white/85 p-5 shadow-soft ring-1 ring-white/70">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-tomato">Could not load</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">This screen needs a refresh</h1>
        <p className="mt-3 text-sm leading-6 text-ink/65">
          Your data is safe. This usually means one request failed while loading the screen.
        </p>
        {error.digest ? <p className="mt-2 text-xs text-ink/45">Error id: {error.digest}</p> : null}
        <button
          className="mt-5 min-h-12 w-full rounded-md bg-gradient-to-r from-rose via-lilac to-aqua px-4 text-sm font-semibold text-ink shadow-sm"
          onClick={reset}
          type="button"
        >
          Try again
        </button>
      </div>
    </section>
  );
}
