"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        router.replace("/?redirectUrl=/dashboard");
      } else {
        setUser(firebaseUser);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    sessionStorage.removeItem("accessToken");
    router.replace("/");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (!user) return null;

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
            <span>{user.email}</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              User ID
            </span>
            <span className="font-mono text-xs break-all">{user.uid}</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Email Verified
            </span>
            <span>{user.emailVerified ? "Yes" : "No"}</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Account Created
            </span>
            <span>
              {user.metadata.creationTime
                ? new Date(user.metadata.creationTime).toLocaleString()
                : "—"}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Last Sign-In
            </span>
            <span>
              {user.metadata.lastSignInTime
                ? new Date(user.metadata.lastSignInTime).toLocaleString()
                : "—"}
            </span>
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
