import bcrypt from "bcryptjs";
import { db } from "../src/db/index.js";

const PASSWORD = "floometer";

const users = [
  { email: "ada@floometer.dev", display_name: "Ada Lovelace", role: "admin" as const },
  { email: "linus@floometer.dev", display_name: "Linus Torvalds", role: "member" as const },
  { email: "grace@floometer.dev", display_name: "Grace Hopper", role: "member" as const },
  { email: "rms@floometer.dev", display_name: "Richard Stallman", role: "viewer" as const },
];

const projects = [
  {
    slug: "lancio-libro",
    name: "Lancio libro Cursor",
    description: "Pre-sale Gumroad, comunicazione LinkedIn, materiale promozionale.",
    owner_email: "ada@floometer.dev",
  },
  {
    slug: "design-system",
    name: "Design system cliente Acme",
    description: "Pipeline AI-driven con Astro + Tailwind + DaisyUI.",
    owner_email: "linus@floometer.dev",
  },
];

const tasks = [
  {
    project_slug: "lancio-libro",
    title: "Allineare naming repo Task Floometer su Gumroad e copy",
    body: "Decisione presa: il nome e Task Floometer. Aggiornare landing, repo e link nel manuale.",
    status: "doing" as const,
    priority: 1,
    assignee_email: "ada@floometer.dev",
    creator_email: "ada@floometer.dev",
  },
  {
    project_slug: "lancio-libro",
    title: "Pianificare la settimana di Cursor su LinkedIn",
    body: "Cinque post a climax, evitando sovrapposizione con AI Week di Davide.",
    status: "todo" as const,
    priority: 2,
    assignee_email: "linus@floometer.dev",
    creator_email: "ada@floometer.dev",
  },
  {
    project_slug: "lancio-libro",
    title: "Sbloccare account Gumroad",
    body: "Login Google eliminato. Ticket aperto, escalation telefonica lunedi.",
    status: "todo" as const,
    priority: 1,
    assignee_email: null,
    creator_email: "ada@floometer.dev",
  },
  {
    project_slug: "lancio-libro",
    title: "Scrivere abstract Gumroad",
    body: "Riusare la descrizione tradotta della call.",
    status: "done" as const,
    priority: 3,
    assignee_email: "grace@floometer.dev",
    creator_email: "ada@floometer.dev",
  },
  {
    project_slug: "design-system",
    title: "Generare tre proposte di tema DaisyUI",
    body: "Persona Cursor: Awwwards designer. Output: tre file JSON tema.",
    status: "doing" as const,
    priority: 2,
    assignee_email: "linus@floometer.dev",
    creator_email: "linus@floometer.dev",
  },
  {
    project_slug: "design-system",
    title: "Intervista cliente: trascrizione e brief",
    body: "Audio registrato, da trascrivere e sintetizzare in brief con deep research.",
    status: "todo" as const,
    priority: 2,
    assignee_email: "grace@floometer.dev",
    creator_email: "linus@floometer.dev",
  },
];

function seed() {
  const passwordHash = bcrypt.hashSync(PASSWORD, 10);
  const insertUser = db.prepare(
    "INSERT INTO users (email, password_hash, display_name, role) VALUES (?, ?, ?, ?)"
  );
  const insertProject = db.prepare(
    "INSERT INTO projects (name, slug, description, owner_id) VALUES (?, ?, ?, ?)"
  );
  const insertMember = db.prepare(
    "INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)"
  );
  const insertTask = db.prepare(
    `INSERT INTO tasks
       (project_id, title, body, status, priority, assignee_id, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const tx = db.transaction(() => {
    db.exec("DELETE FROM tasks; DELETE FROM project_members; DELETE FROM projects; DELETE FROM users;");

    const userIdByEmail = new Map<string, number>();
    for (const u of users) {
      const info = insertUser.run(u.email, passwordHash, u.display_name, u.role);
      userIdByEmail.set(u.email, Number(info.lastInsertRowid));
    }

    const projectIdBySlug = new Map<string, number>();
    for (const p of projects) {
      const ownerId = userIdByEmail.get(p.owner_email);
      if (!ownerId) throw new Error(`Missing owner ${p.owner_email}`);
      const info = insertProject.run(p.name, p.slug, p.description, ownerId);
      const projectId = Number(info.lastInsertRowid);
      projectIdBySlug.set(p.slug, projectId);
      insertMember.run(projectId, ownerId, "owner");
    }

    for (const t of tasks) {
      const projectId = projectIdBySlug.get(t.project_slug);
      if (!projectId) throw new Error(`Missing project ${t.project_slug}`);
      const creatorId = userIdByEmail.get(t.creator_email);
      if (!creatorId) throw new Error(`Missing creator ${t.creator_email}`);
      const assigneeId = t.assignee_email ? userIdByEmail.get(t.assignee_email) ?? null : null;
      insertTask.run(projectId, t.title, t.body, t.status, t.priority, assigneeId, creatorId);
    }
  });

  tx();
  console.log(`Seeded ${users.length} users, ${projects.length} projects, ${tasks.length} tasks.`);
  console.log(`Password per tutti gli utenti: "${PASSWORD}"`);
}

seed();
