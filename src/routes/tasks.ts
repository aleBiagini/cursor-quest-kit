import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { db, type TaskRow, type UserRow } from "../db/index.js";
import { requireAuth } from "../middleware/auth.js";
import {
  canReadProject,
  canWriteProject,
  getMembership,
  getProjectBySlug,
} from "../lib/access.js";

export const tasksRouter = Router();

const taskStatus = z.enum(["todo", "doing", "done", "archived"]);

tasksRouter.get("/api/projects/:slug/tasks", requireAuth, (req: Request, res: Response) => {
  const project = getProjectBySlug(req.params.slug ?? "");
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (!canReadProject(project.id, req.user!.sub, req.user!.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const rows = db
    .prepare("SELECT * FROM tasks WHERE project_id = ? ORDER BY status, priority, id")
    .all(project.id) as TaskRow[];
  res.json({ tasks: rows });
});

const createTaskSchema = z.object({
  title: z.string().min(2).max(180),
  body: z.string().default(""),
  status: taskStatus.default("todo"),
  priority: z.number().int().min(1).max(5).default(3),
  assignee_id: z.number().int().nullable().optional(),
  external_ref: z.string().max(120).nullable().optional(),
});

tasksRouter.post("/api/projects/:slug/tasks", requireAuth, (req: Request, res: Response) => {
  const project = getProjectBySlug(req.params.slug ?? "");
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (!canWriteProject(project.id, req.user!.sub, req.user!.role)) {
    res.status(403).json({ error: "Forbidden", reason: "need contributor or owner" });
    return;
  }
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    return;
  }
  const t = parsed.data;
  if (t.external_ref) {
    const dup = db.prepare("SELECT id FROM tasks WHERE external_ref = ?").get(t.external_ref) as
      | { id: number }
      | undefined;
    if (dup) {
      res.status(409).json({ error: "Conflict", reason: "external_ref already imported", existing_task_id: dup.id });
      return;
    }
  }
  if (t.assignee_id !== null && t.assignee_id !== undefined) {
    const member = getMembership(project.id, t.assignee_id);
    if (!member) {
      res.status(409).json({
        error: "Conflict",
        reason: "assignee is not a project member",
        project_slug: project.slug,
        assignee_id: t.assignee_id,
      });
      return;
    }
  }
  const info = db
    .prepare(
      `INSERT INTO tasks (project_id, title, body, status, priority, assignee_id, external_ref, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      project.id,
      t.title,
      t.body,
      t.status,
      t.priority,
      t.assignee_id ?? null,
      t.external_ref ?? null,
      req.user!.sub
    );
  const created = db.prepare("SELECT * FROM tasks WHERE id = ?").get(Number(info.lastInsertRowid)) as TaskRow;
  res.status(201).json({ task: created });
});

const patchTaskSchema = z.object({
  title: z.string().min(2).max(180).optional(),
  body: z.string().optional(),
  status: taskStatus.optional(),
  priority: z.number().int().min(1).max(5).optional(),
});

tasksRouter.patch("/api/projects/:slug/tasks/:id", requireAuth, (req: Request, res: Response) => {
  const project = getProjectBySlug(req.params.slug ?? "");
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (!canWriteProject(project.id, req.user!.sub, req.user!.role)) {
    res.status(403).json({ error: "Forbidden", reason: "need contributor or owner" });
    return;
  }
  const taskId = Number(req.params.id);
  const task = db.prepare("SELECT * FROM tasks WHERE id = ? AND project_id = ?").get(taskId, project.id) as
    | TaskRow
    | undefined;
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const parsed = patchTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    return;
  }
  const patch = parsed.data;
  if (task.status === "archived" && patch.status && patch.status !== "archived") {
    res.status(409).json({ error: "Conflict", reason: "cannot resurrect archived task" });
    return;
  }
  const next: TaskRow = {
    ...task,
    title: patch.title ?? task.title,
    body: patch.body ?? task.body,
    status: patch.status ?? task.status,
    priority: patch.priority ?? task.priority,
  };
  db.prepare(
    `UPDATE tasks SET title = ?, body = ?, status = ?, priority = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(next.title, next.body, next.status, next.priority, taskId);
  const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as TaskRow;
  res.json({ task: updated });
});

const assignSchema = z.object({ assignee_id: z.number().int().nullable() });

tasksRouter.post("/api/projects/:slug/tasks/:id/assign", requireAuth, (req: Request, res: Response) => {
  const project = getProjectBySlug(req.params.slug ?? "");
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (!canWriteProject(project.id, req.user!.sub, req.user!.role)) {
    res.status(403).json({ error: "Forbidden", reason: "need contributor or owner" });
    return;
  }
  const taskId = Number(req.params.id);
  const task = db.prepare("SELECT * FROM tasks WHERE id = ? AND project_id = ?").get(taskId, project.id) as
    | TaskRow
    | undefined;
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const parsed = assignSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    return;
  }
  if (task.status === "done" || task.status === "archived") {
    res.status(409).json({
      error: "Conflict",
      reason: "cannot reassign a closed task",
      current_status: task.status,
    });
    return;
  }
  if (parsed.data.assignee_id !== null) {
    const user = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(parsed.data.assignee_id) as UserRow | undefined;
    if (!user) {
      res.status(409).json({ error: "Conflict", reason: "assignee does not exist" });
      return;
    }
    const member = getMembership(project.id, parsed.data.assignee_id);
    if (!member) {
      res.status(409).json({
        error: "Conflict",
        reason: "assignee is not a project member",
        assignee_id: parsed.data.assignee_id,
      });
      return;
    }
  }
  db.prepare("UPDATE tasks SET assignee_id = ?, updated_at = datetime('now') WHERE id = ?").run(
    parsed.data.assignee_id,
    taskId
  );
  const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as TaskRow;
  res.json({ task: updated });
});
