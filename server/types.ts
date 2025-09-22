import type { SessionData } from "express-session";

declare module "express-session" {
  interface SessionData {
    user?: {
      id: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      profileImageUrl?: string;
      authProvider?: string;
    };
  }
}

declare global {
  namespace Express {
    interface User {
      claims?: { sub: string };
      id?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      profileImageUrl?: string;
      authProvider?: string;
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
    }
  }
}