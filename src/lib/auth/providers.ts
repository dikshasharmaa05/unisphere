/**
 * OAuth providers. Add ORCID later by implementing its flow and flipping `enabled`.
 * Supabase has no built-in ORCID provider, so `kind: "custom"` providers get their own
 * route handlers (/auth/orcid/start, /auth/orcid/callback) instead of signInWithOAuth.
 */
export type OAuthProviderId = "google" | "orcid";

export type OAuthProvider = {
  id: OAuthProviderId;
  label: string;
  enabled: boolean;
  kind: "supabase" | "custom";
};

export const oauthProviders: OAuthProvider[] = [
  { id: "google", label: "Google", enabled: true, kind: "supabase" },
  { id: "orcid", label: "ORCID", enabled: false, kind: "custom" },
];

export const enabledProviders = () => oauthProviders.filter((p) => p.enabled);

export function getProvider(id: string): OAuthProvider | undefined {
  return oauthProviders.find((p) => p.id === id && p.enabled);
}
