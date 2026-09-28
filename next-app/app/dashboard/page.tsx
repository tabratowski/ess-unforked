"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { identityClient, clearSession, type Subscriber } from "@/lib/identityClient";

export default function Dashboard() {
  const router = useRouter();
  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    identityClient.getMe().then((me) => {
      if (cancelled) return;
      if (!me) {
        router.replace("/");
        return;
      }
      setSubscriber(me);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleLogout = () => {
    clearSession();
    router.replace("/");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 p-8 shadow-md flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Dashboard
        </h1>

        <div className="flex flex-col gap-3 text-sm text-zinc-700 dark:text-zinc-300">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Email
            </span>
            <span>{subscriber?.email ?? "—"}</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Name
            </span>
            <span>
              {subscriber?.givenName || subscriber?.familyName
                ? `${subscriber?.givenName ?? ""} ${subscriber?.familyName ?? ""}`.trim()
                : "—"}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Email Verified
            </span>
            <span>{subscriber ? (subscriber.emailVerified ? "Yes" : "No") : "—"}</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Profile Complete
            </span>
            <span>{subscriber ? (subscriber.profileComplete ? "Yes" : "No") : "—"}</span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
