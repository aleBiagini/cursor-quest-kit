import { db, type ProjectMemberRow, type ProjectRow } from "../db/index.js";

export function getProjectBySlug(slug: string): ProjectRow | null {
  const row = db.prepare("SELECT * FROM projects WHERE slug = ?").get(slug) as ProjectRow | undefined;
  return row ?? null;
}

export function getMembership(projectId: number, userId: number): ProjectMemberRow | null {
  const row = db
    .prepare("SELECT * FROM project_members WHERE project_id = ? AND user_id = ?")
    .get(projectId, userId) as ProjectMemberRow | undefined;
  return row ?? null;
}

export function canWriteProject(projectId: number, userId: number, userRole: string): boolean {
  if (userRole === "admin") return true;
  const m = getMembership(projectId, userId);
  return m !== null && (m.role === "owner" || m.role === "contributor");
}

export function canReadProject(projectId: number, userId: number, userRole: string): boolean {
  if (userRole === "admin") return true;
  return getMembership(projectId, userId) !== null;
}
