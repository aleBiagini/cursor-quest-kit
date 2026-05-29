import { Router, type Request, type Response } from "express";
import { db, type TaskRow } from "../db/index.js";
import { requireAuth } from "../middleware/auth.js";
import { canReadProject, getProjectBySlug } from "../lib/access.js";

export const reportsRouter = Router();

// TODO(quest-3): questo endpoint cade in 500 in certi scenari. Trovare il bug,
// scrivere un test unitario che lo riproduca, sistemarlo e tenere il test verde.
reportsRouter.get("/api/reports/burndown/:slug", requireAuth, (req: Request, res: Response) => {
  const project = getProjectBySlug(req.params.slug ?? "");
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (!canReadProject(project.id, req.user!.sub, req.user!.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const tasks = db.prepare("SELECT * FROM tasks WHERE project_id = ?").all(project.id) as TaskRow[];

  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const completionRatio = done / total;
  const avgPriority =
    tasks.reduce((acc, t) => acc + t.priority, 0) / tasks.filter((t) => t.status !== "archived").length;

  res.json({
    project_slug: project.slug,
    total_tasks: total,
    done_tasks: done,
    completion_ratio: Number(completionRatio.toFixed(2)),
    avg_active_priority: Number(avgPriority.toFixed(2)),
  });
});
