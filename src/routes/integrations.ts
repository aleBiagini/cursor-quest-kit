import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { db, type TaskRow } from "../db/index.js";
import { requireAuth } from "../middleware/auth.js";
import { canWriteProject, getProjectBySlug } from "../lib/access.js";

export const integrationsRouter = Router();

const importItem = z.object({
  external_ref: z.string().min(3),
  title: z.string().min(2).max(180),
  body: z.string().default(""),
  priority: z.number().int().min(1).max(5).default(3),
  labels: z.array(z.string()).default([]),
});

const importPayload = z.object({
  source: z.literal("github"),
  items: z.array(importItem).min(1).max(50),
});

// Quest 2: questo endpoint riceve issue GitHub gia normalizzate e le riversa come task.
// Il lettore costruisce una skill custom che usa l'MCP GitHub per leggere le issue di un repo
// e poi richiama questo endpoint con il payload corretto. La skill vive in `.cursor/skills/`
// del lettore, non nel repo del lab.
integrationsRouter.post("/api/projects/:slug/import", requireAuth, (req: Request, res: Response) => {
  const project = getProjectBySlug(req.params.slug ?? "");
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (!canWriteProject(project.id, req.user!.sub, req.user!.role)) {
    res.status(403).json({ error: "Forbidden", reason: "need contributor or owner" });
    return;
  }
  const parsed = importPayload.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    return;
  }

  const insert = db.prepare(
    `INSERT INTO tasks (project_id, title, body, status, priority, external_ref, created_by)
     VALUES (?, ?, ?, 'todo', ?, ?, ?)`
  );
  const findByRef = db.prepare("SELECT * FROM tasks WHERE external_ref = ?");
  const created: TaskRow[] = [];
  const skipped: Array<{ external_ref: string; reason: string; existing_task_id: number }> = [];

  const tx = db.transaction(() => {
    for (const item of parsed.data.items) {
      const dup = findByRef.get(item.external_ref) as TaskRow | undefined;
      if (dup) {
        skipped.push({
          external_ref: item.external_ref,
          reason: "already imported",
          existing_task_id: dup.id,
        });
        continue;
      }
      const labelSuffix = item.labels.length > 0 ? `\n\nLabels: ${item.labels.join(", ")}` : "";
      const info = insert.run(
        project.id,
        item.title,
        item.body + labelSuffix,
        item.priority,
        item.external_ref,
        req.user!.sub
      );
      const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(Number(info.lastInsertRowid)) as TaskRow;
      created.push(row);
    }
  });
  tx();

  res.status(created.length > 0 ? 201 : 200).json({
    project_slug: project.slug,
    imported: created.length,
    skipped: skipped.length,
    items_imported: created,
    items_skipped: skipped,
  });
});
