"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { apiRequest } from "@/lib/auth-client";

type Friend = {
  id: number;
  friend: { id: number; full_name: string; username: string; email: string };
  status: string;
  created_at: string;
};

export default function FriendsPage() {
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [requestUsername, setRequestUsername] = useState("");
  const [isSending, setIsSending] = useState(false);

  function getAuthHeaders(): Record<string, string> {
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
      const [friendsList, incomingRequests] = await Promise.all([
        apiRequest<Friend[]>("/friends", { method: "GET", headers: getAuthHeaders() }),
        apiRequest<Friend[]>("/friends/requests", { method: "GET", headers: getAuthHeaders() }),
      ]);
      setFriends(friendsList);
      setRequests(incomingRequests);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load friends";
      if (msg.toLowerCase().includes("invalid token") || msg.toLowerCase().includes("user not found")) {
        localStorage.removeItem("cdp_token");
        localStorage.removeItem("cdp_user");
        router.replace("/signin");
        return;
      }
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSendRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSending(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await apiRequest<{ message: string }>("/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ username: requestUsername }),
      });
      setSuccessMessage(`Friend request sent to @${requestUsername}.`);
      setRequestUsername("");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to send request");
    } finally {
      setIsSending(false);
    }
  }

  async function handleAccept(requestId: number) {
    setErrorMessage("");
    try {
      await apiRequest<Friend>(`/friends/${requestId}/accept`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      await loadData();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to accept request");
    }
  }

  async function handleRemove(friendshipId: number) {
    setErrorMessage("");
    try {
      await apiRequest<void>(`/friends/${friendshipId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      setFriends((prev) => prev.filter((f) => f.id !== friendshipId));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to remove friend");
    }
  }

  async function handleReject(requestId: number) {
    setErrorMessage("");
    try {
      await apiRequest<void>(`/friends/${requestId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to reject request");
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-10 text-zinc-100 md:px-12">
      <div className="absolute left-0 top-12 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />

      <section className="relative mx-auto w-full max-w-3xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-1 text-xs tracking-[0.2em] uppercase text-zinc-200">
              Social
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Friends</h1>
          </div>
          <Link
            href="/dashboard"
            className="rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            ← Dashboard
          </Link>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <p className="rounded-xl border border-red-300/30 bg-red-100/10 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </p>
        )}
        {successMessage && (
          <p className="rounded-xl border border-emerald-300/30 bg-emerald-100/10 px-4 py-3 text-sm text-emerald-200">
            {successMessage}
          </p>
        )}

        {/* Send Friend Request */}
        <div className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl">
          <h2 className="mb-4 text-lg font-semibold">Add a Friend</h2>
          <form onSubmit={handleSendRequest} className="flex gap-3">
            <input
              type="text"
              placeholder="@username"
              required
              value={requestUsername}
              onChange={(e) => setRequestUsername(e.target.value)}
              className="flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white placeholder-zinc-400 outline-none focus:ring-2 focus:ring-cyan-400/50"
            />
            <button
              type="submit"
              disabled={isSending}
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {isSending ? "Sending…" : "Send Request"}
            </button>
          </form>
        </div>

        {/* Incoming Requests */}
        <div className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl">
          <h2 className="mb-4 text-lg font-semibold">
            Incoming Requests{" "}
            {requests.length > 0 && (
              <span className="ml-2 rounded-full bg-cyan-500/30 px-2 py-0.5 text-xs text-cyan-200">
                {requests.length}
              </span>
            )}
          </h2>
          {isLoading ? (
            <p className="text-sm text-zinc-400">Loading…</p>
          ) : requests.length === 0 ? (
            <p className="text-sm text-zinc-400">No pending requests.</p>
          ) : (
            <ul className="space-y-3">
              {requests.map((req) => (
                <li
                  key={req.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{req.friend.full_name}</p>
                    <p className="text-xs text-zinc-400">@{req.friend.username}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(req.id)}
                      className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/40"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/40"
                    >
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Friends List */}
        <div className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl">
          <h2 className="mb-4 text-lg font-semibold">
            Friends{" "}
            <span className="text-sm font-normal text-zinc-400">({friends.length})</span>
          </h2>
          {isLoading ? (
            <p className="text-sm text-zinc-400">Loading…</p>
          ) : friends.length === 0 ? (
            <p className="text-sm text-zinc-400">No friends yet. Send a request above!</p>
          ) : (
            <ul className="space-y-3">
              {friends.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{f.friend.full_name}</p>
                    <p className="text-xs text-zinc-400">@{f.friend.username}</p>
                  </div>
                  <button
                    onClick={() => handleRemove(f.id)}
                    className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-red-500/20 hover:text-red-300"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
