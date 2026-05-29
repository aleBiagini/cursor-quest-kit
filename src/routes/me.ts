import { Router, type Request, type Response } from "express";
import { db, type UserRow } from "../db/index.js";
import { requireAuth } from "../middleware/auth.js";

export const meRouter = Router();

meRouter.get("/api/me", requireAuth, (req: Request, res: Response) => {
  const user = db.prepare("SELECT id, email, display_name, role, created_at FROM users WHERE id = ?")
    .get(req.user!.sub) as UserRow | undefined;
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ user });
});
