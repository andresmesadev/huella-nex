import "next-auth";
import "next-auth/jwt";
import type { PendingSocialIdentity } from "./lib/social-identity";

declare module "next-auth" {
  interface User {
    tenantId?: string | null;
    isSuperAdmin?: boolean;
    role?: "admin" | "vet" | "groomer" | "receptionist";
    staffId?: string | null;
    sessionVersion?: number | null;
  }
  interface Session {
    user: {
      email: string;
      name: string;
      tenantId: string | null;
      isSuperAdmin: boolean;
      role: "admin" | "vet" | "groomer" | "receptionist";
      staffId: string | null;
      sessionVersion: number | null;
      socialIdentity?: PendingSocialIdentity;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    socialIdentity?: PendingSocialIdentity;
    tenantId?: string | null;
    isSuperAdmin?: boolean;
    role?: "admin" | "vet" | "groomer" | "receptionist";
    staffId?: string | null;
    sessionVersion?: number | null;
  }
}
