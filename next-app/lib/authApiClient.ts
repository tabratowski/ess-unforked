import { internalFetch as internalApiCall } from "@/lib/internalFetch";
import type { SessionUser } from "@/app/api/auth/me/route";

export const authApiClient = {
  async storeToken(idToken: string, refreshToken: string): Promise<unknown> {
    const res = await internalApiCall("/api/auth/store-token", {
      token: {
        idToken: idToken,
        refreshToken: refreshToken,
      },
    });

    if (!res.ok) {
      throw new Error(`storeToken failed with status ${res.status}`);
    }

    return res.json();
  },

  async authorize(idToken: string): Promise<unknown> {
    const res = await internalApiCall("/api/auth/authorize", {
      IdToken: idToken,
    });

    if (!res.ok) {
      throw new Error(`authorize failed with status ${res.status}`);
    }

    return res.json();
  },

  /** Checks whether the _session cookie is present and valid server-side. */
  async checkSession(): Promise<boolean> {
    const res = await internalApiCall("/api/auth/check");
    return res.ok;
  },

  /** Clears the _session cookie server-side. */
  async logout(): Promise<void> {
    await internalApiCall("/api/auth/logout");
  },

  /** Decodes user info from the _session cookie server-side (no Firebase required). */
  async getMe(): Promise<SessionUser | null> {
    const res = await internalApiCall("/api/auth/me");
    if (!res.ok) return null;
    return res.json() as Promise<SessionUser>;
  },
};
