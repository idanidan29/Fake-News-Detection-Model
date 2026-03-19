"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { apiRequest } from "@/lib/auth-client";
import AppNavbar from "@/components/app-navbar";

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

type SessionParticipant = {
  id: number;
  user: UserSummary;
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

type SessionDetail = {
  session: SessionSummary;
  participants: SessionParticipant[];
  invites: SessionInvite[];
  is_participant: boolean;
  can_join: boolean;
};

type SessionCard = {
  id: number;
  external_id: string;
  title: string;
  description: string;
  image_url: string;
  position: number;
};

type CurrentCardState = {
  card: SessionCard | null;
  session_status: "lobby" | "active" | "matched" | "closed";
  total_participants: number;
  votes_count: number;
  has_voted: boolean;
  is_match: boolean;
  next_card?: SessionCard | null;  // Prefetched for instant display
};

type CardMotionState = "idle" | "exit-left" | "exit-right" | "enter";

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [inviteUsername, setInviteUsername] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [username, setUsername] = useState("");
  const [cardState, setCardState] = useState<CurrentCardState | null>(null);
  const [isSubmittingSwipe, setIsSubmittingSwipe] = useState(false);
  const [displayedCard, setDisplayedCard] = useState<SessionCard | null>(null);
  const [cardMotion, setCardMotion] = useState<CardMotionState>("idle");
  const [bufferedCard, setBufferedCard] = useState<SessionCard | null>(null);

  function authHeaders(): Record<string, string> {
    const token = localStorage.getItem("cdp_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
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
        const parsed = JSON.parse(storedUser) as UserSummary;
        setUsername(parsed.username);
      }
    } catch {
      // Ignore bad cache.
    }

    try {
      const [data, currentCard] = await Promise.all([
        apiRequest<SessionDetail>(`/sessions/${params.id}`, {
          method: "GET",
          headers: authHeaders(),
        }),
        apiRequest<CurrentCardState>(`/sessions/${params.id}/current-card`, {
          method: "GET",
          headers: authHeaders(),
        }),
      ]);
      setDetail(data);
      setCardState(currentCard);
      setDisplayedCard((current) => current ?? currentCard.card);

      // Buffer next card for instant display on first swipe.
      setBufferedCard(currentCard.next_card ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load session.";
      if (message.toLowerCase().includes("invalid token") || message.toLowerCase().includes("user not found")) {
        localStorage.removeItem("cdp_token");
        localStorage.removeItem("cdp_user");
        router.replace("/signin");
        return;
      }
      if (message.toLowerCase().includes("session not found")) {
        router.replace("/sessions");
        return;
      }
      setErrorMessage(message);
    }
  }

  useEffect(() => {
    loadData();
    const pollId = window.setInterval(loadData, 5000);
    return () => window.clearInterval(pollId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    if (isSubmittingSwipe) {
      return;
    }

    if (!cardState?.card) {
      setDisplayedCard(null);
      setCardMotion("idle");
      return;
    }

    setDisplayedCard(cardState.card);
    setCardMotion("enter");
    const timeoutId = window.setTimeout(() => {
      setCardMotion("idle");
    }, 170);
    return () => window.clearTimeout(timeoutId);
  }, [cardState, isSubmittingSwipe]);

  async function handleJoinSession() {
    setErrorMessage("");
    setStatusMessage("");
    try {
      const data = await apiRequest<SessionDetail>(`/sessions/${params.id}/join`, {
        method: "POST",
        headers: authHeaders(),
      });
      setDetail(data);
      setStatusMessage("You joined the session and are now an active participant.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to join session.");
    }
  }

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setStatusMessage("");
    try {
      await apiRequest(`/sessions/${params.id}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ username: inviteUsername.trim().toLowerCase() }),
      });
      setInviteUsername("");
      setStatusMessage("Invite sent.");
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to send invite.");
    }
  }

  async function handleSwipe(direction: "left" | "right") {
    if (!detail?.is_participant || !cardState?.card || cardState.is_match || isSubmittingSwipe) {
      return;
    }

    setErrorMessage("");
    setStatusMessage("");
    setIsSubmittingSwipe(true);
    setCardMotion(direction === "left" ? "exit-left" : "exit-right");
    const previousCard = cardState.card;
    const nextBufferedCard = bufferedCard;

    try {
      const exitDelay = new Promise((resolve) => window.setTimeout(resolve, 150));
      const request = apiRequest<CurrentCardState>(`/sessions/${params.id}/swipe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ direction }),
      });

      await exitDelay;

      // Show prefetched card immediately instead of waiting on network.
      if (nextBufferedCard) {
        setDisplayedCard(nextBufferedCard);
        setCardMotion("enter");
        window.setTimeout(() => setCardMotion("idle"), 170);
      } else {
        setDisplayedCard(null);
      }

      const data = await request;

      setCardState(data);

      // Keep the client-side buffer synchronized with server-side progression.
      setBufferedCard(data.next_card ?? null);

      // If no prefetched card was available, render the returned card when it arrives.
      if (!nextBufferedCard) {
        setDisplayedCard(data.card);
      }
      
      setDetail((current) =>
        current
          ? {
              ...current,
              session: {
                ...current.session,
                status: data.session_status,
              },
            }
          : current,
      );

      if (data.is_match && data.card) {
        setStatusMessage(`Match found: ${data.card.title}`);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to submit swipe.");
      setDisplayedCard(previousCard ?? null);
      setCardMotion("idle");
    } finally {
      setIsSubmittingSwipe(false);
    }
  }

  async function handleLeaveSession() {
    setErrorMessage("");
    setStatusMessage("");
    try {
      await apiRequest<void>(`/sessions/${params.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      router.push("/sessions");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to leave session.";
      if (message.toLowerCase().includes("session not found")) {
        router.push("/sessions");
        return;
      }
      setErrorMessage(message);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-8 text-zinc-100 md:px-12">
      <div className="absolute left-0 top-12 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />

      <AppNavbar username={username} />

      <section className="relative mx-auto w-full max-w-6xl rounded-[32px] border border-white/20 bg-white/10 p-6 backdrop-blur-xl md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-1 text-xs uppercase tracking-[0.2em] text-zinc-200">
              Active Session
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              {detail?.session.title ?? "Loading session..."}
            </h1>
            <p className="mt-2 text-sm text-zinc-200/90">
              Topic: {detail?.session.topic ?? "..."} • Host @{detail?.session.host.username ?? "..."} • Status {detail?.session.status ?? "..."}
            </p>
          </div>
          <Link
            href="/sessions"
            className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            Go Back
          </Link>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleLeaveSession}
            className="rounded-full border border-red-300/30 bg-red-300/10 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-300/20"
          >
            Leave Session
          </button>
        </div>

        {errorMessage && (
          <p className="mt-6 rounded-2xl border border-red-300/30 bg-red-100/10 px-4 py-3 text-sm text-red-100">
            {errorMessage}
          </p>
        )}
        {statusMessage && (
          <p className="mt-6 rounded-2xl border border-emerald-300/30 bg-emerald-100/10 px-4 py-3 text-sm text-emerald-100">
            {statusMessage}
          </p>
        )}

        <div className="mt-8 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-5">
            <div className="rounded-3xl border border-white/20 bg-zinc-950/35 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">Session Room</p>
                  <p className="mt-1 text-sm text-zinc-300">
                    This is the dedicated room for this session. Swiping and real-time state will happen here next.
                  </p>
                </div>
                {detail && !detail.is_participant && detail.can_join && (
                  <button
                    onClick={handleJoinSession}
                    className="rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
                  >
                    Join Session
                  </button>
                )}
              </div>
              {detail && detail.is_participant && (
                <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
                  You are currently part of this session.
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/20 bg-zinc-950/35 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-white">Swipe Round</h2>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-zinc-200">
                  {cardState?.votes_count ?? 0}/{cardState?.total_participants ?? 0} votes
                </span>
              </div>

              {displayedCard ? (
                <div
                  className={[
                    "mt-4 rounded-2xl border border-white/15 bg-white/5 p-4 transition-all duration-200 ease-out will-change-transform",
                    cardMotion === "exit-left" ? "-translate-x-10 rotate-[-6deg] opacity-0" : "",
                    cardMotion === "exit-right" ? "translate-x-10 rotate-[6deg] opacity-0" : "",
                    cardMotion === "enter" ? "translate-y-2 scale-[0.985] opacity-0" : "",
                    cardMotion === "idle" ? "translate-x-0 translate-y-0 rotate-0 scale-100 opacity-100" : "",
                  ].join(" ")}
                >
                  <p className="text-lg font-semibold text-white">{displayedCard.title}</p>
                  <p className="mt-2 text-sm text-zinc-300">{displayedCard.description}</p>
                  {cardState?.is_match && (
                    <p className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
                      Everyone voted right. This card is a match.
                    </p>
                  )}
                </div>
              ) : isSubmittingSwipe ? (
                <div className="mt-4 rounded-2xl border border-white/15 bg-white/5 p-4 animate-pulse">
                  <div className="h-6 w-40 rounded bg-white/10" />
                  <div className="mt-3 h-4 w-full rounded bg-white/10" />
                  <div className="mt-2 h-4 w-5/6 rounded bg-white/10" />
                  <p className="mt-4 text-sm text-zinc-300">Loading next card...</p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-zinc-300">
                  No more cards in your queue right now. If other users continue swiping and a unanimous match happens, it will appear here.
                </p>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => handleSwipe("left")}
                  disabled={!detail?.is_participant || !displayedCard || cardState?.is_match || isSubmittingSwipe}
                  className="flex-1 rounded-full border border-red-300/40 bg-red-200/10 px-4 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-200/20 disabled:opacity-50"
                >
                  {isSubmittingSwipe ? "Swiping..." : "Swipe Left"}
                </button>
                <button
                  onClick={() => handleSwipe("right")}
                  disabled={!detail?.is_participant || !displayedCard || cardState?.is_match || isSubmittingSwipe}
                  className="flex-1 rounded-full border border-emerald-300/40 bg-emerald-200/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-200/20 disabled:opacity-50"
                >
                  {isSubmittingSwipe ? "Swiping..." : "Swipe Right"}
                </button>
              </div>
              {cardState?.is_match && cardState.card && (
                <p className="mt-3 text-xs text-emerald-200">Match locked on: {cardState.card.title}</p>
              )}
            </div>

            <div className="rounded-3xl border border-white/20 bg-zinc-950/35 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-white">Participants</h2>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-zinc-200">
                  {detail?.participants.length ?? 0} joined
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {detail?.participants.map((participant) => (
                  <div key={participant.id} className="rounded-2xl border border-white/15 bg-white/5 p-4">
                    <p className="font-medium text-white">{participant.user.full_name}</p>
                    <p className="text-sm text-zinc-300">@{participant.user.username}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <form onSubmit={handleInvite} className="rounded-3xl border border-white/20 bg-zinc-950/35 p-5">
              <h2 className="text-lg font-semibold text-white">Invite Friend</h2>
              <p className="mt-1 text-sm text-zinc-300">Invite a friend directly into this room.</p>
              <input
                value={inviteUsername}
                onChange={(event) => setInviteUsername(event.target.value)}
                placeholder="friend username"
                required
                className="mt-4 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-zinc-300/70 focus:border-cyan-300 focus:outline-none"
              />
              <button
                type="submit"
                className="mt-3 w-full rounded-full border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Send Invite
              </button>
            </form>

            <div className="rounded-3xl border border-white/20 bg-zinc-950/35 p-5">
              <h2 className="text-lg font-semibold text-white">Pending Invites</h2>
              <div className="mt-4 space-y-3">
                {detail && detail.invites.length > 0 ? (
                  detail.invites.map((invite) => (
                    <div key={invite.id} className="rounded-2xl border border-white/15 bg-white/5 p-4">
                      <p className="font-medium text-white">@{invite.to_user.username}</p>
                      <p className="text-sm text-zinc-300">Status: {invite.status}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-400">No invites yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}