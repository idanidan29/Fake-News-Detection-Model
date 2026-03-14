import Link from "next/link";

export default function SigninPage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-10 text-zinc-100 md:px-12">
      <div className="absolute left-0 top-12 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" />

      <div className="relative mx-auto grid w-full max-w-5xl gap-8 rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl md:grid-cols-2 md:p-10">
        <section className="flex flex-col justify-between gap-6">
          <div className="space-y-4">
            <p className="inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-1 text-xs tracking-[0.2em] uppercase text-zinc-200">
              Sign In
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Welcome back to smarter group decisions.
            </h1>
            <p className="max-w-md text-zinc-200/90">
              Jump into live sessions, reconnect with friends, and keep matching in real time.
            </p>
          </div>

          <div className="rounded-2xl border border-white/20 bg-zinc-950/40 p-4 text-sm text-zinc-200">
            <p className="font-semibold text-white">Inside your dashboard</p>
            <ul className="mt-3 space-y-2">
              <li>• Active sessions and real-time voting rooms</li>
              <li>• Friend activity and session invites</li>
              <li>• Match history and preference insights</li>
            </ul>
          </div>
        </section>

        <section className="rounded-2xl border border-white/20 bg-zinc-950/55 p-5 shadow-xl shadow-black/25">
          <form className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm text-zinc-200">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-zinc-300/70 focus:border-fuchsia-300 focus:outline-none"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm text-zinc-200">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-zinc-300/70 focus:border-fuchsia-300 focus:outline-none"
                placeholder="Your password"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-300">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded border-white/20" />
                Remember me
              </label>
              <a href="#" className="text-fuchsia-300">Forgot password?</a>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Sign In
            </button>

            <p className="text-center text-xs text-zinc-300">
              New here? <Link href="/signup" className="text-fuchsia-300">Create an account</Link>
            </p>
          </form>
        </section>
      </div>

      <div className="relative mx-auto mt-6 w-full max-w-5xl text-sm text-zinc-200">
        <Link href="/" className="rounded-full border border-white/30 bg-white/10 px-4 py-2 transition hover:bg-white/20">
          ← Back to Home
        </Link>
      </div>
    </main>
  );
}
