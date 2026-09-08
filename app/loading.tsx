export default function Loading() {
  return (
    <main
      className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-oat/90 px-5 py-8 shadow-soft"
      id="main-content"
    >
      <div className="h-24 rounded-lg bg-white/60" />
      <div className="mt-5 grid gap-3">
        <div className="h-36 rounded-lg bg-gradient-to-r from-rose/70 via-lilac/70 to-aqua/70" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-28 rounded-lg bg-white/60" />
          <div className="h-28 rounded-lg bg-white/60" />
        </div>
        <div className="h-44 rounded-lg bg-white/60" />
      </div>
      <p className="sr-only">Loading Nutrition Tracker</p>
    </main>
  );
}
