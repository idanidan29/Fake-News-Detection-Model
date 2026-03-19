"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { apiRequest } from "@/lib/auth-client";

type NotificationUser = {
  id: number;
  full_name: string;
  username: string;
  email: string;
};

type FriendNotification = {
  request_id: number;
  from_user: NotificationUser;
  created_at: string;
};

type SessionInviteNotification = {
  invite_id: number;
  session_id: number;
  session_title: string;
  session_topic: string;
  from_user: NotificationUser;
  created_at: string;
};

type NotificationsSummary = {
  pending_friend_requests_count: number;
  pending_session_invites_count: number;
  pending_friend_requests: FriendNotification[];
  pending_session_invites: SessionInviteNotification[];
};

type Toast = {
  id: number;
  text: string;
};

const EMPTY_SUMMARY: NotificationsSummary = {
  pending_friend_requests_count: 0,
  pending_session_invites_count: 0,
  pending_friend_requests: [],
  pending_session_invites: [],
};

export default function NotificationCenter() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [summary, setSummary] = useState<NotificationsSummary>(EMPTY_SUMMARY);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const hasPrimedRef = useRef(false);
  const seenFriendIdsRef = useRef<Set<number>>(new Set());
  const seenInviteIdsRef = useRef<Set<number>>(new Set());

  const total = useMemo(
    () => summary.pending_friend_requests_count + summary.pending_session_invites_count,
    [summary.pending_friend_requests_count, summary.pending_session_invites_count],
  );

  function getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem("cdp_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function pushToast(text: string) {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3500);
  }

  async function refreshSummary() {
    const token = localStorage.getItem("cdp_token");
    if (!token) {
      return;
    }

    try {
      const data = await apiRequest<NotificationsSummary>("/notifications/summary", {
        method: "GET",
        headers: getAuthHeaders(),
      });

      setSummary(data);

      const nextFriendIds = new Set(data.pending_friend_requests.map((item) => item.request_id));
      const nextInviteIds = new Set(data.pending_session_invites.map((item) => item.invite_id));

      if (!hasPrimedRef.current) {
        seenFriendIdsRef.current = nextFriendIds;
        seenInviteIdsRef.current = nextInviteIds;
        hasPrimedRef.current = true;
        return;
      }

      data.pending_friend_requests.forEach((item) => {
        if (!seenFriendIdsRef.current.has(item.request_id)) {
          pushToast(`New friend request from @${item.from_user.username}`);
        }
      });

      data.pending_session_invites.forEach((item) => {
        if (!seenInviteIdsRef.current.has(item.invite_id)) {
          pushToast(`New session invite: ${item.session_title}`);
        }
      });

      seenFriendIdsRef.current = nextFriendIds;
      seenInviteIdsRef.current = nextInviteIds;
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (message.includes("invalid token") || message.includes("user not found")) {
        localStorage.removeItem("cdp_token");
        localStorage.removeItem("cdp_user");
        router.replace("/signin");
      }
    }
  }

  useEffect(() => {
    refreshSummary();
    const id = window.setInterval(refreshSummary, 5000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative z-[90]">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
        aria-label="Notifications"
      >
        <span>Notifications</span>
        {total > 0 && (
          <span className="absolute -right-2 -top-2 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-[95] mt-2 w-80 rounded-2xl border border-white/20 bg-zinc-900/95 p-3 shadow-2xl">
          <p className="text-sm font-semibold text-white">Notifications</p>

          <div className="mt-3 space-y-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-2">
              <p className="text-xs font-semibold text-zinc-200">Friend Requests ({summary.pending_friend_requests_count})</p>
              {summary.pending_friend_requests.length === 0 ? (
                <p className="mt-1 text-xs text-zinc-400">No pending requests.</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {summary.pending_friend_requests.slice(0, 3).map((item) => (
                    <li key={item.request_id} className="text-xs text-zinc-300">
                      @{item.from_user.username}
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/friends" className="mt-2 inline-block text-xs font-semibold text-cyan-300 hover:text-cyan-200">
                Open Friends
              </Link>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-2">
              <p className="text-xs font-semibold text-zinc-200">Session Invites ({summary.pending_session_invites_count})</p>
              {summary.pending_session_invites.length === 0 ? (
                <p className="mt-1 text-xs text-zinc-400">No pending invites.</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {summary.pending_session_invites.slice(0, 3).map((item) => (
                    <li key={item.invite_id} className="text-xs text-zinc-300">
                      {item.session_title}
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/sessions" className="mt-2 inline-block text-xs font-semibold text-cyan-300 hover:text-cyan-200">
                Open Sessions
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="fixed right-4 top-4 z-[100] space-y-2">
        {toasts.map((toast) => (
          <div key={toast.id} className="rounded-xl border border-cyan-300/30 bg-zinc-900/95 px-3 py-2 text-xs text-cyan-100 shadow-lg">
            {toast.text}
          </div>
        ))}
      </div>
    </div>
  );
}
