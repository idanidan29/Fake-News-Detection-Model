import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-8 text-zinc-100 md:px-12 lg:px-20">
      <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-fuchsia-500/30 blur-3xl" />
      <div className="absolute -right-10 top-36 h-96 w-96 rounded-full bg-sky-500/30 blur-3xl" />
      <div className="absolute bottom-0 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-violet-500/20 blur-3xl" />

      <section className="relative mx-auto flex w-full max-w-6xl flex-col gap-14 rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl md:p-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-lg font-semibold tracking-tight">Collaborative Decision Platform</div>
          <Link
            href="/signup"
            className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:scale-[1.02]"
          >
            Start Free
          </Link>
        </header>

        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-6">
            <p className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-4 py-1 text-xs tracking-[0.2em] text-zinc-200 uppercase">
              Real-time group decisions
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl">
              From Maybe to Matched in Seconds.
            </h1>
            <p className="max-w-xl text-base text-zinc-200/90 sm:text-lg">
              Create a room, invite friends, swipe through choices, and lock in one shared answer everyone actually likes.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:scale-[1.02]"
              >
                Create Your Account
              </Link>
              <a
                href="#features"
                className="rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                See Features
              </a>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-white/20 bg-zinc-950/40 p-5 shadow-2xl shadow-black/30">
            <div className="flex items-center justify-between text-sm text-zinc-300">
              <span>Live Session</span>
              <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-emerald-300">4 online</span>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/5 p-4">
              <p className="text-sm text-zinc-300">Tonight&apos;s Pick</p>
              <p className="mt-1 text-xl font-semibold">Sci-Fi Movie Night</p>
              <p className="mt-3 text-sm text-zinc-300">Consensus Score</p>
              <div className="mt-2 h-2 rounded-full bg-white/20">
                <div className="h-2 w-[82%] rounded-full bg-gradient-to-r from-cyan-400 to-violet-400" />
              </div>
              <p className="mt-1 text-right text-xs text-zinc-300">82% aligned</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs text-zinc-200">
              <div className="rounded-lg border border-white/15 bg-white/5 p-3">
                <p className="text-lg font-semibold text-white">19</p>
                <p>Swipes</p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/5 p-3">
                <p className="text-lg font-semibold text-white">6</p>
                <p>Matches</p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/5 p-3">
                <p className="text-lg font-semibold text-white">3m</p>
                <p>Avg. Time</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="relative mx-auto mt-10 grid w-full max-w-6xl gap-4 md:grid-cols-3">
        {[
          {
            title: "Social-first Sessions",
            text: "Invite friends instantly and make every decision collaborative.",
          },
          {
            title: "Tinder-style Voting",
            text: "Swipe fast through options with instant group feedback.",
          },
          {
            title: "Live Consensus",
            text: "Watch matches happen in real time as everyone aligns.",
          },
        ].map((feature) => (
          <article
            key={feature.title}
            className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur"
          >
            <h2 className="text-lg font-semibold text-white">{feature.title}</h2>
            <p className="mt-2 text-sm text-zinc-200/90">{feature.text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
