import { internalFetch } from "@/lib/internalFetch";

export type SocialProvider =
  | "SOCIAL_PROVIDER_UNSPECIFIED"
  | "SOCIAL_PROVIDER_GOOGLE"
  | "SOCIAL_PROVIDER_FACEBOOK";

export interface SocialSignInResponse {
  idToken: string;
  email: string;
  refreshToken: string;
  expirationTime: string;
  subscriberId: string;
  profileComplete: boolean;
  isNewUser: boolean;
}

const PREFIX = "/api/identity/v1";

export const identityClient = {
  async socialSignIn({
    tenantId,
    licenseId,
    ...params
  }: {
    provider: SocialProvider;
    code: string;
    redirectUri: string;
    tenantId: string;
    licenseId: string;
  }): Promise<SocialSignInResponse> {
    const res = await internalFetch(
      `${PREFIX}/subscribers:socialSignIn`,
      params,
      { headers: { "x-tenant-id": tenantId, "x-license-key": licenseId } },
    );
    if (!res.ok)
      throw new Error(`socialSignIn failed with status ${res.status}`);
    return res.json() as Promise<SocialSignInResponse>;
  },
};
