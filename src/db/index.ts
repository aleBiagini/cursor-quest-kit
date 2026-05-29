import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { config } from "../config.js";
import { SCHEMA_SQL } from "./schema.js";

mkdirSync(dirname(config.databaseFile), { recursive: true });

export const db = new Database(config.databaseFile);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(SCHEMA_SQL);

export type UserRow = {
  id: number;
  email: string;
  password_hash: string;
  display_name: string;
  role: "admin" | "member" | "viewer";
  created_at: string;
};

export type ProjectRow = {
  id: number;
  name: string;
  slug: string;
  description: string;
  owner_id: number;
  created_at: string;
};

export type ProjectMemberRow = {
  project_id: number;
  user_id: number;
  role: "owner" | "contributor" | "observer";
};

export type TaskRow = {
  id: number;
  project_id: number;
  title: string;
  body: string;
  status: "todo" | "doing" | "done" | "archived";
  priority: number;
  assignee_id: number | null;
  external_ref: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
};
