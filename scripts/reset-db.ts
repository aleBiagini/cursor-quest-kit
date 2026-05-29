import { rmSync } from "node:fs";
import { config } from "../src/config.js";

try {
  rmSync(config.databaseFile, { force: true });
  rmSync(config.databaseFile + "-journal", { force: true });
  rmSync(config.databaseFile + "-wal", { force: true });
  rmSync(config.databaseFile + "-shm", { force: true });
  console.log(`Removed ${config.databaseFile}`);
} catch (err) {
  console.error("Reset failed", err);
  process.exit(1);
}
