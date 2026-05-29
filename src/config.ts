import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 3000),
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-cambia-mi",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "2h",
  databaseFile: process.env.DATABASE_FILE ?? "./data/task-floometer.db",
  nodeEnv: process.env.NODE_ENV ?? "development",
} as const;

export type AppConfig = typeof config;
