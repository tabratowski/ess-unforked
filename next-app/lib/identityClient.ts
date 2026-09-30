import { internalFetch } from "@/lib/internalFetch";

export type SocialProvider =
  | "SOCIAL_PROVIDER_UNSPECIFIED"
  | "SOCIAL_PROVIDER_GOOGLE"
  | "SOCIAL_PROVIDER_FACEBOOK";

export interface Subscriber {
  name: string;
  email: string;
  givenName: string;
  familyName: string;
  street: string;
  city: string;
  postCode: string;
  regionCode: string;
  emailVerified: boolean;
  profileComplete: boolean;
}

export interface SubscriberSummary {
  id: string;
  email: string;
  givenName: string;
  familyName: string;
  createTime: string;
}

export interface AuthenticateResponse {
  idToken: string;
  email: string;
  refreshToken: string;
  expirationTime: string;
  userId: string;
}

export interface SignUpResponse {
  idToken: string;
  email: string;
  refreshToken: string;
  expirationTime: string;
  subscriberId: string;
}

export interface SocialSignInResponse {
  idToken: string;
  email: string;
  refreshToken: string;
  expirationTime: string;
  subscriberId: string;
  profileComplete: boolean;
  isNewUser: boolean;
}

export interface ListSubscribersResponse {
  subscribers: SubscriberSummary[];
  nextPageToken: string;
}

export interface RefreshTokenResponse {
  idToken: string;
  refreshToken: string;
  expirationTime: string;
  tokenType: string;
  userId: string;
}

export interface VerifyTokenResponse {
  token: string;
  refreshToken: string;
  expirationTime: string;
}

export interface Tenant {
  name: string;
  licenseId: string;
  displayName: string;
}

const PREFIX = "/api/identity/v1";

function bearerHeaders(): Record<string, string> {
  const token = localStorage.getItem("idToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function storeSession(idToken: string, subscriberId: string) {
  localStorage.setItem("idToken", idToken);
  localStorage.setItem("subscriberId", subscriberId);
}

export function clearSession() {
  localStorage.removeItem("idToken");
  localStorage.removeItem("subscriberId");
  internalFetch("/api/auth/logout", {}).catch(() => {});
}

export const identityClient = {
  // --- Subscriber ---

  async getMe(): Promise<Subscriber | null> {
    const subscriberId = localStorage.getItem("subscriberId");
    if (!subscriberId) return null;
    try {
      return await this.getSubscriber(subscriberId);
    } catch {
      clearSession();
      return null;
    }
  },

  async authenticate(
    email: string,
    password: string,
  ): Promise<AuthenticateResponse> {
    const res = await internalFetch(`${PREFIX}/subscribers:authenticate`, {
      email,
      password,
    });
    if (!res.ok)
      throw new Error(`authenticate failed with status ${res.status}`);
    const data = (await res.json()) as AuthenticateResponse;
    storeSession(data.idToken, data.userId);
    return data;
  },

  async signUp(params: {
    email: string;
    password: string;
    givenName?: string;
    familyName?: string;
    street?: string;
    city?: string;
    postCode?: string;
    regionCode?: string;
  }): Promise<SignUpResponse> {
    const res = await internalFetch(`${PREFIX}/subscribers:signUp`, params);
    if (!res.ok) throw new Error(`signUp failed with status ${res.status}`);
    const data = (await res.json()) as SignUpResponse;
    storeSession(data.idToken, data.subscriberId);
    return data;
  },

  async socialSignIn(params: {
    provider: SocialProvider;
    code: string;
    redirectUri: string;
  }): Promise<SocialSignInResponse> {
    const res = await internalFetch(
      `${PREFIX}/subscribers:socialSignIn`,
      params,
    );
    if (!res.ok)
      throw new Error(`socialSignIn failed with status ${res.status}`);
    const data = (await res.json()) as SocialSignInResponse;
    storeSession(data.idToken, data.subscriberId);
    return data;
  },

  async resetPassword(email: string): Promise<{ success: boolean }> {
    const res = await internalFetch(`${PREFIX}/subscribers:resetPassword`, {
      email,
    });
    if (!res.ok)
      throw new Error(`resetPassword failed with status ${res.status}`);
    return res.json() as Promise<{ success: boolean }>;
  },

  async verifyEmail(oobCode: string): Promise<{ emailVerified: boolean }> {
    const res = await internalFetch(`${PREFIX}/subscribers:verifyEmail`, {
      oobCode,
    });
    if (!res.ok)
      throw new Error(`verifyEmail failed with status ${res.status}`);
    return res.json() as Promise<{ emailVerified: boolean }>;
  },

  async getSubscriber(subscriberId: string): Promise<Subscriber> {
    const res = await internalFetch(
      `${PREFIX}/subscribers/${encodeURIComponent(subscriberId)}`,
      undefined,
      { method: "GET", headers: bearerHeaders() },
    );
    if (!res.ok)
      throw new Error(`getSubscriber failed with status ${res.status}`);
    return res.json() as Promise<Subscriber>;
  },

  async updateSubscriber(
    subscriberId: string,
    fields: Partial<
      Pick<
        Subscriber,
        | "email"
        | "givenName"
        | "familyName"
        | "street"
        | "city"
        | "postCode"
        | "regionCode"
      >
    >,
  ): Promise<Subscriber> {
    const res = await internalFetch(
      `${PREFIX}/subscribers/${encodeURIComponent(subscriberId)}`,
      { subscriber: fields },
      { method: "PATCH", headers: bearerHeaders() },
    );
    if (!res.ok)
      throw new Error(`updateSubscriber failed with status ${res.status}`);
    return res.json() as Promise<Subscriber>;
  },

  async deleteSubscriber(subscriberId: string): Promise<void> {
    const res = await internalFetch(
      `${PREFIX}/subscribers/${encodeURIComponent(subscriberId)}`,
      undefined,
      { method: "DELETE", headers: bearerHeaders() },
    );
    if (!res.ok)
      throw new Error(`deleteSubscriber failed with status ${res.status}`);
  },

  async listSubscribers(params?: {
    pageSize?: number;
    pageToken?: string;
    email?: string;
  }): Promise<ListSubscribersResponse> {
    const query = new URLSearchParams();
    if (params?.pageSize) query.set("pageSize", String(params.pageSize));
    if (params?.pageToken) query.set("pageToken", params.pageToken);
    if (params?.email) query.set("email", params.email);
    const qs = query.toString();
    const res = await internalFetch(
      `${PREFIX}/subscribers${qs ? `?${qs}` : ""}`,
      undefined,
      { method: "GET" },
    );
    if (!res.ok)
      throw new Error(`listSubscribers failed with status ${res.status}`);
    return res.json() as Promise<ListSubscribersResponse>;
  },

  async sendVerificationEmail(subscriberId: string): Promise<void> {
    const res = await internalFetch(
      `${PREFIX}/subscribers/${encodeURIComponent(subscriberId)}:sendVerificationEmail`,
      {},
      { headers: bearerHeaders() },
    );
    if (!res.ok)
      throw new Error(
        `sendVerificationEmail failed with status ${res.status}`,
      );
  },

  async requestEmailChange(
    subscriberId: string,
    newEmail: string,
  ): Promise<{ success: boolean }> {
    const res = await internalFetch(
      `${PREFIX}/subscribers/${encodeURIComponent(subscriberId)}:requestEmailChange`,
      { newEmail },
      { headers: bearerHeaders() },
    );
    if (!res.ok)
      throw new Error(`requestEmailChange failed with status ${res.status}`);
    return res.json() as Promise<{ success: boolean }>;
  },

  async confirmEmailChange(
    subscriberId: string,
    oobCode: string,
  ): Promise<{ email: string; emailVerified: boolean }> {
    const res = await internalFetch(
      `${PREFIX}/subscribers/${encodeURIComponent(subscriberId)}:confirmEmailChange`,
      { oobCode },
      { headers: bearerHeaders() },
    );
    if (!res.ok)
      throw new Error(`confirmEmailChange failed with status ${res.status}`);
    return res.json() as Promise<{ email: string; emailVerified: boolean }>;
  },

  async purgeSubscribers(
    tenantId: string,
    filter: string,
    force: boolean,
  ): Promise<unknown> {
    const res = await internalFetch(
      `${PREFIX}/tenants/${encodeURIComponent(tenantId)}/subscribers:purge`,
      { filter, force },
    );
    if (!res.ok)
      throw new Error(`purgeSubscribers failed with status ${res.status}`);
    return res.json();
  },

  // --- Tenant ---

  async registerTenant(displayName: string): Promise<Tenant> {
    const res = await internalFetch(`${PREFIX}/tenants:register`, {
      displayName,
    });
    if (!res.ok)
      throw new Error(`registerTenant failed with status ${res.status}`);
    return res.json() as Promise<Tenant>;
  },

  async getTenant(tenantId: string): Promise<Tenant> {
    const res = await internalFetch(
      `${PREFIX}/tenants/${encodeURIComponent(tenantId)}`,
      undefined,
      { method: "GET" },
    );
    if (!res.ok) throw new Error(`getTenant failed with status ${res.status}`);
    return res.json() as Promise<Tenant>;
  },

  async updateTenant(
    tenantId: string,
    fields: Partial<Pick<Tenant, "licenseId" | "displayName">>,
  ): Promise<Tenant> {
    const res = await internalFetch(
      `${PREFIX}/tenants/${encodeURIComponent(tenantId)}`,
      { tenant: fields },
      { method: "PATCH" },
    );
    if (!res.ok)
      throw new Error(`updateTenant failed with status ${res.status}`);
    return res.json() as Promise<Tenant>;
  },

  async deleteTenant(tenantId: string): Promise<void> {
    const res = await internalFetch(
      `${PREFIX}/tenants/${encodeURIComponent(tenantId)}`,
      undefined,
      { method: "DELETE" },
    );
    if (!res.ok)
      throw new Error(`deleteTenant failed with status ${res.status}`);
  },

  // --- Token ---

  async refreshToken(token: string): Promise<RefreshTokenResponse> {
    const res = await internalFetch(`${PREFIX}/tokens:refresh`, { token });
    if (!res.ok)
      throw new Error(`refreshToken failed with status ${res.status}`);
    const data = (await res.json()) as RefreshTokenResponse;
    storeSession(data.idToken, data.userId);
    return data;
  },

  async verifyToken(token: string): Promise<VerifyTokenResponse> {
    const res = await internalFetch(`${PREFIX}/tokens:verify`, { token });
    if (!res.ok)
      throw new Error(`verifyToken failed with status ${res.status}`);
    return res.json() as Promise<VerifyTokenResponse>;
  },
};
