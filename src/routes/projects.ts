import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { db, type ProjectRow } from "../db/index.js";
import { requireAuth } from "../middleware/auth.js";
import { canReadProject, getProjectBySlug } from "../lib/access.js";

export const projectsRouter = Router();

projectsRouter.get("/api/projects", requireAuth, (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const role = req.user!.role;
  const rows =
    role === "admin"
      ? (db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all() as ProjectRow[])
      : (db
          .prepare(
            `SELECT p.* FROM projects p
             JOIN project_members m ON m.project_id = p.id
             WHERE m.user_id = ?
             ORDER BY p.created_at DESC`
          )
          .all(userId) as ProjectRow[]);
  res.json({ projects: rows });
});

projectsRouter.get("/api/projects/:slug", requireAuth, (req: Request, res: Response) => {
  const project = getProjectBySlug(req.params.slug ?? "");
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (!canReadProject(project.id, req.user!.sub, req.user!.role)) {
    res.status(403).json({ error: "Forbidden", reason: "not a project member" });
    return;
  }
  res.json({ project });
});

const createProjectSchema = z.object({
  name: z.string().min(2),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "slug must be kebab-case"),
  description: z.string().default(""),
});

projectsRouter.post("/api/projects", requireAuth, (req: Request, res: Response) => {
  if (req.user!.role === "viewer") {
    res.status(403).json({ error: "Forbidden", reason: "viewers cannot create projects" });
    return;
  }
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    return;
  }
  const { name, slug, description } = parsed.data;
  const existing = db.prepare("SELECT 1 FROM projects WHERE slug = ?").get(slug);
  if (existing) {
    res.status(409).json({ error: "Slug already in use" });
    return;
  }
  const info = db
    .prepare("INSERT INTO projects (name, slug, description, owner_id) VALUES (?, ?, ?, ?)")
    .run(name, slug, description, req.user!.sub);
  const projectId = Number(info.lastInsertRowid);
  db.prepare("INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, 'owner')").run(
    projectId,
    req.user!.sub
  );
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId) as ProjectRow;
  res.status(201).json({ project });
});
