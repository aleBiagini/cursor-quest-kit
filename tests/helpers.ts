import bcrypt from "bcryptjs";
import { unlinkSync } from "node:fs";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { db } from "../src/db/index.js";
import { signSession } from "../src/middleware/auth.js";
import { buildApp } from "../src/server.js";

export const TEST_PASSWORD = "floometer";

export type SeededUser = {
  id: number;
  email: string;
  display_name: string;
  role: "admin" | "member" | "viewer";
};

export function resetDb(): void {
  db.exec("DELETE FROM tasks; DELETE FROM project_members; DELETE FROM projects; DELETE FROM users;");
}

export function ensureDataDir(): void {
  mkdirSync(path.resolve("data"), { recursive: true });
}

export function seedMinimal(): {
  ada: SeededUser;
  linus: SeededUser;
  rms: SeededUser;
  projectId: number;
  projectSlug: string;
} {
  resetDb();
  const hash = bcrypt.hashSync(TEST_PASSWORD, 6);
  const insertUser = db.prepare(
    "INSERT INTO users (email, password_hash, display_name, role) VALUES (?, ?, ?, ?)"
  );
  const ada = Number(insertUser.run("ada@test.dev", hash, "Ada", "admin").lastInsertRowid);
  const linus = Number(insertUser.run("linus@test.dev", hash, "Linus", "member").lastInsertRowid);
  const rms = Number(insertUser.run("rms@test.dev", hash, "RMS", "viewer").lastInsertRowid);

  const projectId = Number(
    db
      .prepare("INSERT INTO projects (name, slug, description, owner_id) VALUES (?, ?, ?, ?)")
      .run("Demo", "demo", "Progetto di test", ada).lastInsertRowid
  );
  db.prepare("INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)").run(projectId, ada, "owner");
  db.prepare("INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)").run(projectId, linus, "contributor");

  return {
    ada: { id: ada, email: "ada@test.dev", display_name: "Ada", role: "admin" },
    linus: { id: linus, email: "linus@test.dev", display_name: "Linus", role: "member" },
    rms: { id: rms, email: "rms@test.dev", display_name: "RMS", role: "viewer" },
    projectId,
    projectSlug: "demo",
  };
}

export function authHeader(user: SeededUser): string {
  const token = signSession({ id: user.id, email: user.email, role: user.role });
  return `Bearer ${token}`;
}

export function makeApp() {
  return buildApp();
}

export function silentUnlink(p: string): void {
  try {
    unlinkSync(p);
  } catch {
    // ignore
  }
}
