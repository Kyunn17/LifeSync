import type { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import type { UserRole } from "@lifesync/shared";
import { auth } from "../config/auth";
import { sendError } from "../utils/response";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  role: UserRole;
  banned?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      authSession?: {
        id: string;
        userId: string;
        expiresAt: Date;
      };
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sessionData = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!sessionData || !sessionData.user) {
      sendError(res, 401, "UNAUTHORIZED", "Authentication required. Please sign in.");
      return;
    }

    const rawUser = sessionData.user as AuthenticatedUser;

    if (rawUser.banned) {
      sendError(res, 403, "ACCOUNT_SUSPENDED", "Your account has been suspended.");
      return;
    }

    req.user = {
      id: rawUser.id,
      name: rawUser.name,
      email: rawUser.email,
      emailVerified: rawUser.emailVerified,
      image: rawUser.image,
      role: rawUser.role === "ADMIN" ? "ADMIN" : "USER",
      banned: Boolean(rawUser.banned),
    };

    req.authSession = {
      id: sessionData.session.id,
      userId: sessionData.session.userId,
      expiresAt: new Date(sessionData.session.expiresAt),
    };

    next();
  } catch (error) {
    console.error("[Auth Middleware Error]:", error);
    sendError(res, 401, "UNAUTHORIZED", "Invalid or expired session");
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(
        res,
        403,
        "FORBIDDEN",
        "You do not have permission to access this resource"
      );
      return;
    }

    next();
  };
}

