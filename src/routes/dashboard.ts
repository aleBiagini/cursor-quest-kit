import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { db, type ProjectRow, type TaskRow, type UserRow } from "../db/index.js";
import { requireAuth } from "../middleware/auth.js";
import { canWriteProject, getProjectBySlug } from "../lib/access.js";
import { h, layout, raw } from "../lib/layout.js";

export const dashboardRouter = Router();

function loadCurrentUser(req: Request): UserRow | null {
  if (!req.user) return null;
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.sub) as UserRow | undefined;
  return row ?? null;
}

dashboardRouter.get("/", (req: Request, res: Response) => {
  if (req.user) {
    res.redirect("/dashboard");
    return;
  }
  res.redirect("/login");
});

dashboardRouter.get("/dashboard", requireAuth, (req: Request, res: Response) => {
  const user = loadCurrentUser(req);
  if (!user) {
    res.redirect("/login");
    return;
  }
  const projects =
    user.role === "admin"
      ? (db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all() as ProjectRow[])
      : (db
          .prepare(
            `SELECT p.* FROM projects p
             JOIN project_members m ON m.project_id = p.id
             WHERE m.user_id = ?
             ORDER BY p.created_at DESC`
          )
          .all(user.id) as ProjectRow[]);

  const rows = projects
    .map(
      (p) => h`
        <tr>
          <td><a href="/projects/${p.slug}">${p.name}</a></td>
          <td class="muted">${p.slug}</td>
          <td class="muted">${p.description}</td>
        </tr>
      `
    )
    .join("");

  const body = h`
    <h1>I tuoi progetti</h1>
    <p class="muted">Sei loggato come ${user.display_name} (${user.role}).</p>
    <div class="card">
      ${
        projects.length === 0
          ? raw('<p class="muted">Nessun progetto ancora. Chiedi a un admin di aggiungerti.</p>')
          : raw(`<table>
              <thead><tr><th>Progetto</th><th>Slug</th><th>Descrizione</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>`)
      }
    </div>
  `;
  res.send(layout({ title: "Dashboard", user, body }));
});

dashboardRouter.get("/projects/:slug", requireAuth, (req: Request, res: Response) => {
  const user = loadCurrentUser(req);
  if (!user) {
    res.redirect("/login");
    return;
  }
  const project = getProjectBySlug(req.params.slug ?? "");
  if (!project) {
    res.status(404).send(layout({ title: "Non trovato", user, body: "<div class='card'>Progetto non trovato.</div>" }));
    return;
  }
  const tasks = db
    .prepare("SELECT * FROM tasks WHERE project_id = ? ORDER BY status, priority, id")
    .all(project.id) as TaskRow[];

  const members = db
    .prepare(
      `SELECT u.id, u.display_name, u.email, m.role
       FROM project_members m JOIN users u ON u.id = m.user_id
       WHERE m.project_id = ?`
    )
    .all(project.id) as Array<{ id: number; display_name: string; email: string; role: string }>;

  const assigneeOptions = members
    .map((m) => h`<option value="${m.id}">${m.display_name} (${m.role})</option>`)
    .join("");

  const rows = tasks
    .map(
      (t) => h`
        <tr>
          <td>${t.title}</td>
          <td><span class="status status-${t.status}">${t.status}</span></td>
          <td class="muted">P${t.priority}</td>
          <td class="muted">${t.external_ref ?? ""}</td>
        </tr>
      `
    )
    .join("");

  const canWrite = canWriteProject(project.id, user.id, user.role);

  const body = h`
    <div class="row between">
      <h1>${project.name}</h1>
      <a class="muted" href="/dashboard">Torna ai progetti</a>
    </div>
    <p class="muted">${project.description}</p>

    <div class="card">
      <h2>Task</h2>
      ${
        tasks.length === 0
          ? raw('<p class="muted">Nessun task ancora.</p>')
          : raw(`<table>
              <thead><tr><th>Titolo</th><th>Stato</th><th>Priorita</th><th>Ref esterno</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>`)
      }
    </div>

    ${
      canWrite
        ? raw(`
          <div class="card">
            <h2>Nuovo task</h2>
            <form method="post" action="/projects/${project.slug}/tasks" class="stacked">
              <label for="title">Titolo</label>
              <input id="title" name="title" required maxlength="180" />
              <label for="body">Descrizione</label>
              <textarea id="body" name="body"></textarea>
              <label for="priority">Priorita (1-5)</label>
              <input id="priority" name="priority" type="number" min="1" max="5" value="3" />
              <label for="assignee_id">Assegnatario</label>
              <select id="assignee_id" name="assignee_id">
                <option value="">Nessuno</option>
                ${assigneeOptions}
              </select>
              <div style="margin-top: 16px;"><button type="submit">Crea task</button></div>
            </form>
          </div>
        `)
        : raw('<p class="muted">Il tuo ruolo non permette di creare task in questo progetto.</p>')
    }
  `;
  res.send(layout({ title: project.name, user, body }));
});

const formCreateTask = z.object({
  title: z.string().min(2).max(180),
  body: z.string().default(""),
  priority: z.coerce.number().int().min(1).max(5).default(3),
  assignee_id: z.string().optional(),
});

dashboardRouter.post("/projects/:slug/tasks", requireAuth, (req: Request, res: Response) => {
  const user = loadCurrentUser(req);
  if (!user) {
    res.redirect("/login");
    return;
  }
  const project = getProjectBySlug(req.params.slug ?? "");
  if (!project) {
    res.redirect("/dashboard");
    return;
  }
  if (!canWriteProject(project.id, user.id, user.role)) {
    res.redirect(`/projects/${project.slug}?flash=` + encodeURIComponent("Non hai i permessi per creare task qui"));
    return;
  }
  const parsed = formCreateTask.safeParse(req.body);
  if (!parsed.success) {
    res.redirect(`/projects/${project.slug}?flash=` + encodeURIComponent("Dati del task non validi"));
    return;
  }
  const assigneeId = parsed.data.assignee_id ? Number(parsed.data.assignee_id) : null;
  db.prepare(
    `INSERT INTO tasks (project_id, title, body, status, priority, assignee_id, created_by)
     VALUES (?, ?, ?, 'todo', ?, ?, ?)`
  ).run(project.id, parsed.data.title, parsed.data.body, parsed.data.priority, assigneeId, user.id);
  res.redirect(`/projects/${project.slug}`);
});
