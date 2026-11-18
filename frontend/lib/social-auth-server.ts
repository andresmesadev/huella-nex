import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Apple from "next-auth/providers/apple";
import type { Account, Profile } from "next-auth";
import type { NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { apiUrl } from "@/lib/api";
import type { PendingSocialIdentity } from "@/lib/social-identity";

export function configuredSocialProviders(): NextAuthConfig["providers"] {
  if (!process.env.INTERNAL_API_SECRET) return [];
  const providers: NextAuthConfig["providers"] = [];
  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    providers.push(Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET }));
  }
  if (process.env.AUTH_MICROSOFT_ENTRA_ID_ID && process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET) {
    providers.push(MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: "https://login.microsoftonline.com/common/v2.0",
      authorization: { params: { scope: "openid email profile" } },
      profile: profile => ({ id: profile.sub, email: profile.email, name: profile.name, image: null }),
    }));
  }
  if (process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET) {
    providers.push(Apple({
      clientId: process.env.AUTH_APPLE_ID, clientSecret: process.env.AUTH_APPLE_SECRET,
      profile: profile => ({ id: profile.sub, email: profile.email, image: null }),
    }));
  }
  return providers;
}

export function pendingIdentity(account: Account, profile?: Profile): PendingSocialIdentity {
  const provider = account.provider;
  if (provider !== "google" && provider !== "microsoft-entra-id" && provider !== "apple") {
    throw new Error("Unsupported identity provider");
  }
  const subject = profile?.sub;
  if (typeof subject !== "string" || !/^[!-~]{1,255}$/.test(subject) || account.providerAccountId !== subject) {
    throw new Error("Missing provider subject");
  }
  let issuer = profile?.iss;
  if (provider === "google" && issuer === "accounts.google.com") issuer = "https://accounts.google.com";
  const validIssuer = provider === "google" ? issuer === "https://accounts.google.com"
    : provider === "apple" ? issuer === "https://appleid.apple.com"
    : typeof issuer === "string" && /^https:\/\/login\.microsoftonline\.com\/[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}\/v2\.0$/.test(issuer);
  if (typeof issuer !== "string" || !validIssuer) throw new Error("Unexpected identity issuer");
  const verification: unknown = profile?.email_verified;
  const emailVerified = verification === true || verification === "true";
  const hint = provider === "microsoft-entra-id" || emailVerified ? profile?.email : null;
  const emailHint = typeof hint === "string" && hint.length <= 254 ? hint : "";
  return { provider, issuer, subject, emailHint, expiresAt: Date.now() + 15 * 60_000 };
}

export async function resolveSocialIdentity(token: JWT, identity: PendingSocialIdentity): Promise<JWT> {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) throw new Error("Social login not configured");
  const response = await fetch(apiUrl("/api/internal/social-login"), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Internal-Token": secret },
    body: JSON.stringify({ provider: identity.provider, issuer: identity.issuer, subject: identity.subject }),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Could not validate social account");
  const data = await response.json();
  if (data.state === "new") {
    return {
      ...token, email: "", name: "", picture: null, tenantId: null, staffId: null,
      sessionVersion: null, role: "receptionist", isSuperAdmin: false, socialIdentity: identity,
    };
  }
  if (data.state !== "linked" || !data.staffId || !data.tenantId ||
    !["admin", "vet", "groomer", "receptionist"].includes(data.role) ||
    !Number.isSafeInteger(data.sessionVersion)) throw new Error("Invalid business access");
  return {
    ...token, sub: data.staffId, email: data.email, name: data.name, picture: null,
    tenantId: data.tenantId, staffId: data.staffId, sessionVersion: data.sessionVersion,
    role: data.role, isSuperAdmin: false, socialIdentity: undefined,
  };
}
