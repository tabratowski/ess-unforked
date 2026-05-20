"use client";

import { Suspense } from "react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { authApiClient } from "@/lib/authApiClient";

type Mode = "signin" | "register";

const ALLOWED_REDIRECT_HOSTS = [
  "wpenginepoweredstaging.com",
  "wpenginepowered.com",
];

function isSafeRedirect(url: string): boolean {
  if (url.startsWith("/")) return true;
  try {
    const { hostname } = new URL(url);
    return ALLOWED_REDIRECT_HOSTS.some(
      (h) => hostname === h || hostname.endsWith("." + h),
    );
  } catch {
    return false;
  }
}

function navigate(
  router: ReturnType<typeof useRouter>,
  url: string,
  replace = false,
) {
  if (url.startsWith("/")) {
    replace ? router.replace(url) : router.push(url);
  } else {
    replace ? window.location.replace(url) : (window.location.href = url);
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // On mount: if a valid _session cookie exists, skip the login form
  useEffect(() => {
    authApiClient.checkSession().then((authenticated) => {
      if (authenticated) {
        const redirectUrl = searchParams.get("redirectUrl");
        const dest =
          redirectUrl && isSafeRedirect(redirectUrl)
            ? redirectUrl
            : "/dashboard";
        navigate(router, dest, true);
      }
    });
  }, [router, searchParams]);

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      const token = await credential.user.getIdToken();
      await credential.user.getIdTokenResult(false);
      const redirectUrl = searchParams.get("redirectUrl");
      await authApiClient.storeToken(token, credential.user.refreshToken);
      const dest =
        redirectUrl && isSafeRedirect(redirectUrl) ? redirectUrl : "/dashboard";
      navigate(router, dest);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const credential =
        mode === "signin"
          ? await signInWithEmailAndPassword(auth, email, password)
          : await createUserWithEmailAndPassword(auth, email, password);

      const token = await credential.user.getIdToken();

      // Validate token with Firebase before proceeding
      await credential.user.getIdTokenResult(/* forceRefresh */ false);

      await authApiClient.storeToken(token, credential.user.refreshToken);

      const redirectUrl = searchParams.get("redirectUrl");
      const dest =
        redirectUrl && isSafeRedirect(redirectUrl) ? redirectUrl : "/dashboard";
      navigate(router, dest);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 p-8 shadow-md flex flex-col gap-5"
      >
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {mode === "signin" ? "Sign In" : "Register"}
        </h1>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex flex-col gap-1">
          <label
            htmlFor="email"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="password"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-500"
          />
        </div>

        <button
          type="submit"
          className="rounded-lg bg-zinc-900 dark:bg-zinc-50 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
        >
          {mode === "signin" ? "Sign In" : "Register"}
        </button>

        <div className="flex items-center gap-3">
          <hr className="flex-1 border-zinc-200 dark:border-zinc-700" />
          <span className="text-xs text-zinc-400">or</span>
          <hr className="flex-1 border-zinc-200 dark:border-zinc-700" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="flex items-center justify-center gap-3 rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          {mode === "signin" ? (
            <>
              No account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
                className="font-medium text-zinc-900 dark:text-zinc-100 underline"
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                }}
                className="font-medium text-zinc-900 dark:text-zinc-100 underline"
              >
                Sign In
              </button>
            </>
          )}
        </p>
      </form>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
