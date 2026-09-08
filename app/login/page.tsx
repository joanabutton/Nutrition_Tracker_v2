import { signIn, signUp } from "@/app/login/actions";

type LoginPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { message } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10" id="main-content">
      <section className="w-full max-w-sm rounded-lg bg-white/90 p-6 shadow-soft">
        <p className="text-sm font-medium text-moss">Nutrition Tracker</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink">Sign in</h1>
        <p className="mt-3 text-sm leading-6 text-ink/70">
          Private food tracking for one user. Create an account in your Supabase project, or sign
          in with an existing one.
        </p>

        {message ? (
          <p className="mt-4 rounded-md border border-tomato/30 bg-tomato/10 px-3 py-2 text-sm text-tomato">
            {message}
          </p>
        ) : null}

        <form className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-ink">
            Email
            <input
              className="min-h-12 rounded-md border border-ink/15 bg-white px-3 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-mint"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-ink">
            Password
            <input
              className="min-h-12 rounded-md border border-ink/15 bg-white px-3 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-mint"
              name="password"
              type="password"
              autoComplete="current-password"
              minLength={6}
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              className="min-h-12 rounded-md bg-ink px-4 text-sm font-semibold text-white transition hover:bg-moss"
              formAction={signIn}
              type="submit"
            >
              Sign in
            </button>
            <button
              className="min-h-12 rounded-md border border-ink/15 bg-white px-4 text-sm font-semibold text-ink transition hover:border-moss"
              formAction={signUp}
              type="submit"
            >
              Sign up
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
