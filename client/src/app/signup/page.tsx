"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { apiRequest } from "@/lib/auth-client";

type AuthResponse = {
  access_token: string;
  user: {
    id: number;
    full_name: string;
    email: string;
  };
};

export default function SignupPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage("");
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      full_name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
    };

    try {
      const data = await apiRequest<AuthResponse>("/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      localStorage.setItem("cdp_token", data.access_token);
      localStorage.setItem("cdp_user", JSON.stringify(data.user));
      setStatusMessage("Registration successful. Redirecting...");
      form.reset();
      router.push("/dashboard");
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Registration failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-10 text-zinc-100 md:px-12">
      <div className="absolute left-0 top-12 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />

      <div className="relative mx-auto grid w-full max-w-5xl gap-8 rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl md:grid-cols-2 md:p-10">
        <section className="flex flex-col justify-between gap-6">
          <div className="space-y-4">
            <p className="inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-1 text-xs tracking-[0.2em] uppercase text-zinc-200">
              Register
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Create your account and start matching smarter.
            </h1>
            <p className="max-w-md text-zinc-200/90">
              Launch your first collaborative session in under a minute and discover choices your whole group agrees on.
            </p>
          </div>

          <div className="rounded-2xl border border-white/20 bg-zinc-950/40 p-4 text-sm text-zinc-200">
            <p className="font-semibold text-white">Why people love it</p>
            <ul className="mt-3 space-y-2">
              <li>• Fast group decisions without endless chat threads</li>
              <li>• Real-time votes and transparent matching</li>
              <li>• Designed for movies, games, events, and more</li>
            </ul>
          </div>
        </section>

        <section className="rounded-2xl border border-white/20 bg-zinc-950/55 p-5 shadow-xl shadow-black/25">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label htmlFor="name" className="mb-1 block text-sm text-zinc-200">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-zinc-300/70 focus:border-cyan-300 focus:outline-none"
                placeholder="Alex Morgan"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-1 block text-sm text-zinc-200">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-zinc-300/70 focus:border-cyan-300 focus:outline-none"
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
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-zinc-300/70 focus:border-cyan-300 focus:outline-none"
                placeholder="At least 8 characters"
              />
            </div>

            <label className="flex items-start gap-2 text-xs text-zinc-300">
              <input type="checkbox" className="mt-0.5 rounded border-white/20" required />
              <span>I agree to the Terms and Privacy Policy.</span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
            >
              {isSubmitting ? "Creating account..." : "Create Account"}
            </button>

            {statusMessage && (
              <p className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-center text-xs text-zinc-200">
                {statusMessage}
              </p>
            )}

            <p className="text-center text-xs text-zinc-300">
              Already have an account? <Link href="/signin" className="text-cyan-300">Sign in</Link>
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
