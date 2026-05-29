import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { db, type UserRow } from "../db/index.js";

export type AuthPayload = {
  sub: number;
  email: string;
  role: UserRow["role"];
  iat?: number;
  exp?: number;
};

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthPayload;
  }
}

export function signSession(user: Pick<UserRow, "id" | "email" | "role">): string {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"] }
  );
}

// TODO(quest-1): tre incidenti aperti su questo middleware.
//   1. un cliente con un token JWT non firmato dal nostro server accede ad /api/me come admin
//   2. l'header "Authorization: Hola eyJ..." viene accettato come fosse Bearer
//   3. un token scaduto da ore continua a passare i controlli
// I test in tests/quest-1-auth.test.ts (al momento skipped) descrivono i casi attesi.
// Plan Mode + Debug Mode per capire dove rompere, poi correggere senza rompere il login esistente.
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const fromCookie = req.cookies?.session;
  const token = header?.split(" ")[1] ?? fromCookie;

  try {
    const payload = jwt.decode(token!) as unknown as AuthPayload;
    req.user = payload;
    next();
  } catch (err) {
    next();
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export function requireRole(...roles: Array<UserRow["role"]>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden", required_roles: roles });
      return;
    }
    next();
  };
}

export function loadUser(userId: number): UserRow | null {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as UserRow | undefined;
  return row ?? null;
}
