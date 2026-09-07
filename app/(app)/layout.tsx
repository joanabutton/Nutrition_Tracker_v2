import { redirect } from "next/navigation";

import { signOut } from "@/app/(app)/actions";
import { AppNav } from "@/components/app-nav";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-oat/90 shadow-soft">
      <header className="sticky top-0 z-10 border-b border-white/70 bg-oat/80 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">
              Daily nutrition
            </p>
            <h1 className="text-xl font-semibold text-ink">Nutrition Tracker</h1>
          </div>
          <form action={signOut}>
            <button className="min-h-11 rounded-md border border-white/70 bg-white/55 px-3 text-sm font-medium text-ink shadow-sm">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div className="flex-1 px-5 py-5">{children}</div>
      <nav className="sticky bottom-0 border-t border-white/70 bg-white/82 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <AppNav />
      </nav>
    </main>
  );
}
