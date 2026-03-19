"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { apiRequest } from "@/lib/auth-client";
import AppNavbar from "@/components/app-navbar";

const SESSIONS_CACHE_KEY = "cdp_cache_sessions";
const SESSION_INVITES_CACHE_KEY = "cdp_cache_session_invites";

type UserSummary = {
  id: number;
  full_name: string;
  username: string;
  email: string;
};

type SessionSummary = {
  id: number;
  title: string;
  topic: string;
  status: "lobby" | "active" | "matched" | "closed";
  host: UserSummary;
  created_at: string;
};

type SessionInvite = {
  id: number;
  session_id: number;
  session_title: string;
  session_topic: string;
  from_user: UserSummary;
  to_user: UserSummary;
  status: "pending" | "accepted" | "declined";
  created_at: string;
};

export default function SessionsPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [invites, setInvites] = useState<SessionInvite[]>([]);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("movie");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function authHeaders(): Record<string, string> {
    const token = localStorage.getItem("cdp_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function normalizeAuthError(message: string) {
    const lower = message.toLowerCase();
    return lower.includes("invalid token") || lower.includes("user not found");
  }

  async function loadData() {
    const token = localStorage.getItem("cdp_token");
    if (!token) {
      router.replace("/signin");
      return;
    }

    try {
      const storedUser = localStorage.getItem("cdp_user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser) as { username?: string };
        setUsername(parsed.username ?? "");
      }
    } catch {
      // Ignore bad cached user payload.
    }

    try {
      const [mySessions, myInvites] = await Promise.all([
        apiRequest<SessionSummary[]>("/sessions/mine", {
          method: "GET",
          headers: authHeaders(),
        }),
        apiRequest<SessionInvite[]>("/sessions/invites/mine", {
          method: "GET",
          headers: authHeaders(),
        }),
      ]);
      setSessions(mySessions);
      setInvites(myInvites);
      localStorage.setItem(SESSIONS_CACHE_KEY, JSON.stringify(mySessions));
      localStorage.setItem(SESSION_INVITES_CACHE_KEY, JSON.stringify(myInvites));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load sessions.";
      if (normalizeAuthError(message)) {
        localStorage.removeItem("cdp_token");
        localStorage.removeItem("cdp_user");
        router.replace("/signin");
        return;
      }
      setErrorMessage(message);
    } finally {
      // Keep existing content visible while refreshing.
    }
  }

  useEffect(() => {
    try {
      const cachedSessions = localStorage.getItem(SESSIONS_CACHE_KEY);
      const cachedInvites = localStorage.getItem(SESSION_INVITES_CACHE_KEY);
      if (cachedSessions) {
        setSessions(JSON.parse(cachedSessions) as SessionSummary[]);
      }
      if (cachedInvites) {
        setInvites(JSON.parse(cachedInvites) as SessionInvite[]);
      }
    } catch {
      // Ignore invalid cached payloads and continue with fresh fetch.
    }

    loadData();
    const pollId = window.setInterval(loadData, 5000);
    return () => window.clearInterval(pollId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage("");
    setErrorMessage("");

    try {
      const created = await apiRequest<SessionSummary>("/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ title, topic }),
      });

      const updated = [created, ...sessions];
      setSessions(updated);
      setTitle("");
      setStatusMessage("Session created and opened.");
      router.push(`/sessions/${created.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create session.");
    }
  }

  async function handleRespondInvite(invite: SessionInvite, decision: "accept" | "decline") {
    setStatusMessage("");
    setErrorMessage("");

    try {
      await apiRequest<SessionInvite>(`/sessions/invites/${invite.id}/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ decision }),
      });
      setInvites((prev) => prev.filter((item) => item.id !== invite.id));
      await loadData();
      if (decision === "accept") {
        router.push(`/sessions/${invite.session_id}`);
        return;
      }
      setStatusMessage("Invite declined.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to respond to invite.");
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-8 text-zinc-100 md:px-12">
      <div className="absolute left-0 top-12 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />

      <AppNavbar username={username} />

      <section className="relative mx-auto w-full max-w-6xl rounded-[32px] border border-white/20 bg-white/10 p-6 backdrop-blur-xl md:p-10">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-1 text-xs tracking-[0.2em] uppercase text-zinc-200">
              Sessions
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Active Rooms</h1>
            <p className="mt-2 text-sm text-zinc-200/90">
              Create a room, open its dedicated page instantly, and let invited friends join from their own side.
            </p>
          </div>
        </header>

        {errorMessage && (
          <p className="mt-6 rounded-xl border border-red-300/30 bg-red-100/10 px-4 py-3 text-sm text-red-100">
            {errorMessage}
          </p>
        )}

        {statusMessage && (
          <p className="mt-6 rounded-xl border border-emerald-300/30 bg-emerald-100/10 px-4 py-3 text-sm text-emerald-100">
            {statusMessage}
          </p>
        )}

        <div className="mt-8 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={handleCreateSession} className="rounded-[28px] border border-white/20 bg-zinc-950/35 p-5">
            <h2 className="text-lg font-semibold text-white">Create a New Session</h2>
            <p className="mt-1 text-sm text-zinc-300">The room becomes active immediately and opens on its own page.</p>
            <div className="mt-4 space-y-3">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Weekend movie night"
                required
                minLength={2}
                maxLength={140}
                className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-zinc-300/70 focus:border-cyan-300 focus:outline-none"
              />
              <select
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white focus:border-cyan-300 focus:outline-none"
              >
                <option value="movie">Movie</option>
                <option value="game">Game</option>
                <option value="book">Book</option>
                <option value="event">Event</option>
                <option value="custom">Custom</option>
              </select>
              <button
                type="submit"
                className="w-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Create And Open Room
              </button>
            </div>
          </form>

          <div className="rounded-[28px] border border-white/20 bg-zinc-950/35 p-5">
            <h2 className="text-lg font-semibold text-white">How It Works</h2>
            <ol className="mt-4 space-y-3 text-sm text-zinc-300">
              <li>1. Create a session with a topic.</li>
              <li>2. You are taken directly into that session page.</li>
              <li>3. Invite friends from inside the room.</li>
              <li>4. Invited users press Join Session to become active participants.</li>
              <li>5. Everyone can return to the room later from the Sessions page.</li>
            </ol>
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <article className="rounded-[28px] border border-white/20 bg-zinc-950/35 p-5">
            <h2 className="text-lg font-semibold text-white">My Rooms</h2>
            {sessions.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-300">No sessions yet.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {sessions.map((item) => (
                  <li key={item.id} className="rounded-3xl border border-white/15 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-white">{item.title}</p>
                        <p className="text-sm text-zinc-300">Topic: {item.topic} • Status: {item.status}</p>
                      </div>
                      <Link
                        href={`/sessions/${item.id}`}
                        className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                      >
                        Open Room
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="rounded-[28px] border border-white/20 bg-zinc-950/35 p-5">
            <h2 className="text-lg font-semibold text-white">Incoming Invites</h2>
            {invites.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-300">No pending invites.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {invites.map((invite) => (
                  <li key={invite.id} className="rounded-3xl border border-white/15 bg-white/5 p-4">
                    <p className="text-base font-semibold text-white">{invite.session_title}</p>
                    <p className="text-sm text-zinc-300">Topic: {invite.session_topic} • From @{invite.from_user.username}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/sessions/${invite.session_id}`}
                        className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                      >
                        View Session
                      </Link>
                      <button
                        onClick={() => handleRespondInvite(invite, "accept")}
                        className="rounded-full border border-emerald-300/40 bg-emerald-200/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-200/20"
                      >
                        Join Session
                      </button>
                      <button
                        onClick={() => handleRespondInvite(invite, "decline")}
                        className="rounded-full border border-red-300/40 bg-red-200/10 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-200/20"
                      >
                        Decline
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      </section>
    </main>
  );
}
