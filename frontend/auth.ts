import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { configuredSocialProviders, pendingIdentity, resolveSocialIdentity } from "./lib/social-auth-server";

import { authConfig } from "./auth.config";
import { canonicalAdminEmail, verifyAdminCredential } from "./lib/operator-channel/admin-auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    ...authConfig.callbacks,
    async jwt(args) {
      const { account, profile, token, trigger } = args;
      if (account && account.type === "oidc") return resolveSocialIdentity(token, pendingIdentity(account, profile));
      if (token.socialIdentity) {
        if (token.socialIdentity.expiresAt <= Date.now()) return null;
        if (trigger === "update") return resolveSocialIdentity(token, token.socialIdentity);
      }
      return authConfig.callbacks.jwt(args);
    },
  },
  providers: [
    ...configuredSocialProviders(),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().trim();
        const password = credentials?.password?.toString();

        const adminEmail = process.env.ADMIN_EMAIL?.trim();

        if (!email || !password) {
          return null;
        }

        const verifiedAdmin = verifyAdminCredential(email, password);
        if (verifiedAdmin) {
          return {
            id: "admin",
            email: verifiedAdmin,
            name: "Administrador",
            tenantId: null,
            isSuperAdmin: true,
            role: "admin",
          };
        }

        // El administrador conserva su acceso exclusivo incluso si comparte
        // accidentalmente correo con una cuenta del staff.
        if (adminEmail && canonicalAdminEmail(email) === canonicalAdminEmail(adminEmail)) return null;

        const secret = process.env.INTERNAL_API_SECRET;
        if (!secret) return null;
        try {
          const base = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/$/, "");
          const response = await fetch(`${base}/api/internal/staff-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Internal-Token": secret },
            body: JSON.stringify({ email, password }),
            cache: "no-store",
          });
          if (!response.ok) return null;
          const staff = await response.json() as { staffId: string; tenantId: string; name: string; email: string; role: "admin" | "vet" | "groomer" | "receptionist"; sessionVersion: number };
          return {
            id: staff.staffId,
            email: staff.email,
            name: staff.name,
            tenantId: staff.tenantId,
            staffId: staff.staffId,
            role: staff.role,
            sessionVersion: staff.sessionVersion,
            isSuperAdmin: false,
          };
        } catch {
          return null;
        }

      },
    }),
  ],
});
