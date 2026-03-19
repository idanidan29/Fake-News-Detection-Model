"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import NotificationCenter from "@/components/notification-center";

type AppNavbarProps = {
  username?: string;
};

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/sessions", label: "Sessions" },
  { href: "/friends", label: "Friends" },
];

export default function AppNavbar({ username }: AppNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem("cdp_token");
    localStorage.removeItem("cdp_user");
    router.replace("/signin");
  }

  return (
    <nav className="relative z-[80] mx-auto mb-8 w-full max-w-6xl rounded-[28px] border border-white/20 bg-white/10 px-4 py-4 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl md:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-100/80">Collaborative Decision Platform</p>
          <div className="mt-2 flex items-center gap-3">
            <p className="text-xl font-semibold text-white">Control Center</p>
            {username && (
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-zinc-200">
                @{username}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <NotificationCenter />
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  isActive
                    ? "bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-lg shadow-cyan-500/20"
                    : "border border-white/25 bg-white/10 text-zinc-100 hover:bg-white/20",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="rounded-full border border-rose-200/30 bg-rose-300/10 px-4 py-2 text-sm font-semibold text-rose-50 transition hover:bg-rose-300/20"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}