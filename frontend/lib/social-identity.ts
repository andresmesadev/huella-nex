export type SocialProvider = "google" | "microsoft-entra-id" | "apple";

export type PendingSocialIdentity = {
  provider: SocialProvider;
  issuer: string;
  subject: string;
  emailHint: string;
  expiresAt: number;
};

export const SOCIAL_PROVIDER_LABELS: Record<SocialProvider, string> = {
  google: "Google",
  "microsoft-entra-id": "Microsoft",
  apple: "Apple",
};
