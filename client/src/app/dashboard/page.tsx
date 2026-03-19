"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/auth-client";
import AppNavbar from "@/components/app-navbar";

type AuthUser = {
  id: number;
  full_name: string;
  username: string;
  email: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem("cdp_user");
      return stored ? (JSON.parse(stored) as AuthUser) : null;
    } catch {
      return null;
    }
  });
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function validateSession() {
      const token = localStorage.getItem("cdp_token");
      if (!token) {
        router.replace("/signin");
        return;
      }

      try {
        const me = await apiRequest<AuthUser>("/auth/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        localStorage.setItem("cdp_user", JSON.stringify(me));
        if (isMounted) {
          setUser(me);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not validate session. Please try again.";
        if (message.toLowerCase().includes("invalid token") || message.toLowerCase().includes("user not found")) {
          localStorage.removeItem("cdp_token");
          localStorage.removeItem("cdp_user");
          router.replace("/signin");
          return;
        }
        if (isMounted) {
          setErrorMessage(message);
        }
      }
    }

    validateSession();

    return () => {
      isMounted = false;
    };
  }, [router]);
  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-8 text-zinc-100 md:px-12">
      <div className="absolute left-0 top-12 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />

      <AppNavbar username={user?.username} />

      <section className="relative mx-auto w-full max-w-5xl rounded-[32px] border border-white/20 bg-white/10 p-6 backdrop-blur-xl md:p-10">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-1 text-xs tracking-[0.2em] uppercase text-zinc-200">
              Dashboard
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Welcome{user ? `, ${user.full_name}` : ""}
            </h1>
            <p className="mt-1 text-sm font-medium text-zinc-300/80">
              @{user?.username ?? ""}
            </p>
            <p className="mt-2 text-sm text-zinc-200/90">
              Your account is authenticated and ready for collaborative sessions.
            </p>
          </div>
        </header>

        {errorMessage && (
          <p className="mt-6 rounded-xl border border-amber-300/30 bg-amber-100/10 px-4 py-3 text-sm text-amber-100">
            {errorMessage}
          </p>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-white/20 bg-zinc-950/40 p-4">
            <p className="text-xs text-zinc-300">Active Sessions</p>
            <p className="mt-1 text-2xl font-semibold text-white">0</p>
          </article>
          <article className="rounded-2xl border border-white/20 bg-zinc-950/40 p-4">
            <p className="text-xs text-zinc-300">Friends Online</p>
            <p className="mt-1 text-2xl font-semibold text-white">0</p>
          </article>
          <article className="rounded-2xl border border-white/20 bg-zinc-950/40 p-4">
            <p className="text-xs text-zinc-300">Total Matches</p>
            <p className="mt-1 text-2xl font-semibold text-white">0</p>
          </article>
        </div>

        <div className="mt-8 text-sm text-zinc-200">
          <p>Signed in as: <span className="font-medium text-white">@{user?.username ?? "Unknown"}</span></p>
          <Link
            href="/"
            className="mt-4 inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-2 transition hover:bg-white/20"
          >
            Back to Home
          </Link>
        </div>
      </section>
    </main>
  );
}
