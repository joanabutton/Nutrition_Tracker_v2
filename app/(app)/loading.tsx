export default function AppLoading() {
  return (
    <section className="grid gap-5" aria-busy="true" aria-live="polite">
      <div className="rounded-lg bg-gradient-to-br from-rose/80 via-lilac/80 to-aqua/80 p-4 shadow-soft">
        <div className="h-5 w-28 rounded-full bg-white/50" />
        <div className="mt-3 h-10 w-32 rounded-md bg-white/55" />
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="h-12 rounded-md bg-white/65" />
          <div className="h-12 rounded-md bg-white/65" />
        </div>
      </div>
      <div className="grid grid-cols-[6.5rem_1fr] gap-3">
        <div className="h-44 rounded-lg bg-white/55" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="h-20 rounded-lg bg-white/55" key={index} />
          ))}
        </div>
      </div>
      <div className="h-56 rounded-lg bg-white/60" />
      <p className="sr-only">Loading</p>
    </section>
  );
}
