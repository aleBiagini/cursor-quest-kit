import express, { type NextFunction, type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { authenticate } from "./middleware/auth.js";
import { HttpError } from "./lib/http-error.js";
import { authRouter } from "./routes/auth.js";
import { meRouter } from "./routes/me.js";
import { projectsRouter } from "./routes/projects.js";
import { tasksRouter } from "./routes/tasks.js";
import { reportsRouter } from "./routes/reports.js";
import { integrationsRouter } from "./routes/integrations.js";
import { dashboardRouter } from "./routes/dashboard.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function buildApp(): express.Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "200kb" }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  app.use(express.static(path.resolve(__dirname, "..", "public")));

  app.get("/healthz", (_req: Request, res: Response) => {
    res.json({ ok: true, ts: new Date().toISOString() });
  });

  app.use(authenticate);

  app.use(authRouter);
  app.use(meRouter);
  app.use(projectsRouter);
  app.use(tasksRouter);
  app.use(reportsRouter);
  app.use(integrationsRouter);
  app.use(dashboardRouter);

  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message, details: err.details });
      return;
    }
    const isApi = req.path.startsWith("/api");
    console.error("[unhandled]", err);
    if (isApi) {
      res.status(500).json({ error: "Internal server error" });
      return;
    }
    res.status(500).send("<h1>Errore interno</h1><pre>" + (err instanceof Error ? err.message : String(err)) + "</pre>");
  });

  return app;
}

if (process.argv[1] && process.argv[1].endsWith("server.ts")) {
  const app = buildApp();
  app.listen(config.port, () => {
    console.log(`Task Floometer in ascolto su http://localhost:${config.port}`);
    console.log(`  Login: ada@floometer.dev / floometer`);
  });
}
