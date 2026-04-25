import type { Request, Response, NextFunction } from "express";
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
  type SessionPayload,
} from "../lib/session";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session?: SessionPayload;
    }
  }
}

export function attachSession(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  const session = verifySessionToken(token);
  if (session) {
    req.session = session;
  }
  next();
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
