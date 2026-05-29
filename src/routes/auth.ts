import bcrypt from "bcryptjs";
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { db, type UserRow } from "../db/index.js";
import { signSession } from "../middleware/auth.js";
import { layout } from "../lib/layout.js";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.get("/login", (req: Request, res: Response) => {
  const flash = typeof req.query.flash === "string" ? req.query.flash : null;
  const body = `
    <div class="card" style="max-width: 420px; margin: 80px auto;">
      <h1>Accedi a Task Floometer</h1>
      <p class="muted">Account demo: ada@floometer.dev / floometer</p>
      <form method="post" action="/login" class="stacked">
        <label for="email">Email</label>
        <input id="email" name="email" type="email" required autocomplete="email" />
        <label for="password">Password</label>
        <input id="password" name="password" type="password" required autocomplete="current-password" />
        <div style="margin-top: 16px;"><button type="submit">Entra</button></div>
      </form>
    </div>
  `;
  res.send(layout({ title: "Accedi", body, flash }));
});

authRouter.post("/login", (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.redirect("/login?flash=" + encodeURIComponent("Credenziali non valide"));
    return;
  }
  const { email, password } = parsed.data;
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRow | undefined;
  if (!user) {
    res.redirect("/login?flash=" + encodeURIComponent("Email o password errati"));
    return;
  }
  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) {
    res.redirect("/login?flash=" + encodeURIComponent("Email o password errati"));
    return;
  }
  const token = signSession(user);
  res.cookie("session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 1000 * 60 * 60 * 2,
  });
  res.redirect("/dashboard");
});

authRouter.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie("session");
  res.redirect("/login?flash=" + encodeURIComponent("Sessione chiusa"));
});

authRouter.post("/api/login", (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRow | undefined;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = signSession(user);
  res.json({ token, user: { id: user.id, email: user.email, display_name: user.display_name, role: user.role } });
});
