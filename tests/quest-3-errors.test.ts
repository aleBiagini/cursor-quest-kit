import { describe, it, expect } from "vitest";
import request from "supertest";
import { authHeader, makeApp, seedMinimal } from "./helpers.js";
import { db } from "../src/db/index.js";

// QUEST 3 - Cloud Agent + Agents Window
// Skeleton di partenza per i casi 403, 500, 409. Il lettore deve:
//   - delegare al cloud agent la stesura di una test suite completa (happy path + errori)
//   - usare l'Agents Window per parallelizzare auth/tasks/integrations
//   - chiudere il loop come gate di qualita: leggere il diff, far girare i test, gestire i flaky
describe("Quest 3: errori HTTP", () => {
  describe("403 - autorizzazione di progetto", () => {
    it("un viewer non puo creare task in un progetto a cui non appartiene", async () => {
      const seed = seedMinimal();
      const res = await request(makeApp())
        .post(`/api/projects/${seed.projectSlug}/tasks`)
        .set("Authorization", authHeader(seed.rms))
        .send({ title: "Tentativo non autorizzato" });
      expect(res.status).toBe(403);
    });
  });

  describe("409 - conflitti business", () => {
    it("non si puo riassegnare un task in stato done", async () => {
      const seed = seedMinimal();
      const taskId = Number(
        db
          .prepare(
            `INSERT INTO tasks (project_id, title, body, status, priority, created_by)
             VALUES (?, 'Task chiuso', '', 'done', 3, ?)`
          )
          .run(seed.projectId, seed.ada.id).lastInsertRowid
      );
      const res = await request(makeApp())
        .post(`/api/projects/${seed.projectSlug}/tasks/${taskId}/assign`)
        .set("Authorization", authHeader(seed.ada))
        .send({ assignee_id: seed.linus.id });
      expect(res.status).toBe(409);
    });

    it("non si puo importare due volte la stessa issue (external_ref duplicato)", async () => {
      const seed = seedMinimal();
      await request(makeApp())
        .post(`/api/projects/${seed.projectSlug}/import`)
        .set("Authorization", authHeader(seed.ada))
        .send({
          source: "github",
          items: [{ external_ref: "gh:floometer#42", title: "Fix login", priority: 2 }],
        });
      const second = await request(makeApp())
        .post(`/api/projects/${seed.projectSlug}/import`)
        .set("Authorization", authHeader(seed.ada))
        .send({
          source: "github",
          items: [{ external_ref: "gh:floometer#42", title: "Duplicato", priority: 2 }],
        });
      expect(second.status).toBe(200);
      expect(second.body.imported).toBe(0);
      expect(second.body.skipped).toBe(1);
    });
  });

  describe.skip("500 - il bug del burndown (da diagnosticare e fixare)", () => {
    // Suggerimento: questo test riproduce il caso che fa cadere /api/reports/burndown/:slug.
    // Al momento e' skipped: rimuovilo, fai cadere il server, poi sistema reports.ts.
    it("non deve crashare quando il progetto ha 0 task", async () => {
      const seed = seedMinimal();
      const res = await request(makeApp())
        .get(`/api/reports/burndown/${seed.projectSlug}`)
        .set("Authorization", authHeader(seed.ada));
      expect(res.status).toBe(200);
      expect(res.body.completion_ratio).toBe(0);
    });

    it("non deve crashare quando tutti i task sono archived", async () => {
      const seed = seedMinimal();
      db.prepare(
        `INSERT INTO tasks (project_id, title, body, status, priority, created_by)
         VALUES (?, 'Vecchio', '', 'archived', 3, ?)`
      ).run(seed.projectId, seed.ada.id);
      const res = await request(makeApp())
        .get(`/api/reports/burndown/${seed.projectSlug}`)
        .set("Authorization", authHeader(seed.ada));
      expect(res.status).toBe(200);
    });
  });
});
