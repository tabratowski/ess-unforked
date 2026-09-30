"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { identityClient } from "@/lib/identityClient";

const REDIRECT_URI_KEY = "redirectUri";
const IDENTITY_TOKEN_KEY = "identityToken";
const TENANT_ID_KEY = "tenantId";
const LICENSE_ID_KEY = "licenseId";

/** Decodes the `c` param: base64 of `tenantId:licenseId`. */
function decodeCredentials(c: string | null): {
  tenantId?: string;
  licenseId?: string;
} {
  if (!c) return {};
  try {
    const decoded = atob(c);
    const separator = decoded.indexOf(":");
    if (separator === -1) return {};
    return {
      tenantId: decoded.slice(0, separator),
      licenseId: decoded.slice(separator + 1),
    };
  } catch {
    return {};
  }
}

function Proxy() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  // Guards against the effect running twice (React strict mode) and
  // exchanging the one-time Google code twice.
  const started = useRef(false);

  const handleGoogleSignIn = (redirectUrl: string) => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError("Google sign-in is not configured.");
      return;
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${window.location.origin}`,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent",
      state: redirectUrl,
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const oauthError = searchParams.get("error");
    if (oauthError) {
      setError(`Google sign-in failed: ${oauthError}`);
      return;
    }

    const code = searchParams.get("code");
    if (code) {
      const redirectUri =
        sessionStorage.getItem(REDIRECT_URI_KEY) ?? searchParams.get("state");
      if (!redirectUri) {
        setError("Missing redirectUri.");
        return;
      }

      const tenantId = sessionStorage.getItem(TENANT_ID_KEY);
      const licenseId = sessionStorage.getItem(LICENSE_ID_KEY);
      if (!tenantId || !licenseId) {
        setError("Missing tenantId or licenseId.");
        return;
      }

      identityClient
        .socialSignIn({
          provider: "SOCIAL_PROVIDER_GOOGLE",
          code,
          redirectUri: `${window.location.origin}`,
          tenantId,
          licenseId,
        })
        .then(({ idToken, subscriberId }) => {
          sessionStorage.setItem(IDENTITY_TOKEN_KEY, idToken);
          sessionStorage.removeItem(REDIRECT_URI_KEY);
          sessionStorage.removeItem(TENANT_ID_KEY);
          sessionStorage.removeItem(LICENSE_ID_KEY);
          // Fragment is never sent to servers; the target app reads it client-side.
          const target = new URL(redirectUri);
          target.hash = new URLSearchParams({
            t: btoa(idToken),
            subscriberId,
          }).toString();
          window.location.replace(target.toString());
        })
        .catch((err: unknown) => {
          setError(
            err instanceof Error ? err.message : "Google sign-in failed.",
          );
        });
      return;
    }

    const redirectUri = searchParams.get("redirectUrl");
    const { tenantId, licenseId } = decodeCredentials(searchParams.get("c"));
    if (!redirectUri || !tenantId || !licenseId) {
      setError("Missing or invalid redirectUrl or c query parameter.");
      return;
    }

    sessionStorage.setItem(REDIRECT_URI_KEY, redirectUri);
    sessionStorage.setItem(TENANT_ID_KEY, tenantId);
    sessionStorage.setItem(LICENSE_ID_KEY, licenseId);
    handleGoogleSignIn(redirectUri);
  }, [searchParams]);

  return <p>{error ?? "Redirecting…"}</p>;
}

export default function Home() {
  return (
    <Suspense>
      <Proxy />
    </Suspense>
  );
}
