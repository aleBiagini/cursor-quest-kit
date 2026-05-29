import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import request from "supertest";
import { authHeader, makeApp, seedMinimal } from "./helpers.js";
import { config } from "../src/config.js";

// QUEST 1 - questi test sono lo "spec" del middleware corretto.
// Al primo run la maggior parte fallisce: e' normale, il middleware e' rotto di proposito.
// Obiettivo: capire i bug in Plan Mode, sistemarli e farli passare tutti senza toccare i test.
describe.skip("Quest 1: middleware di autenticazione", () => {
  it("accetta un token firmato dal nostro server con header Bearer", async () => {
    const seed = seedMinimal();
    const res = await request(makeApp()).get("/api/me").set("Authorization", authHeader(seed.ada));
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("ada@test.dev");
  });

  it("rifiuta un token firmato con un segreto diverso", async () => {
    seedMinimal();
    const forged = jwt.sign({ sub: 1, email: "ada@test.dev", role: "admin" }, "segreto-sbagliato");
    const res = await request(makeApp()).get("/api/me").set("Authorization", `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  it("rifiuta un token con payload ma senza firma (jwt.decode-only)", async () => {
    seedMinimal();
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ sub: 1, email: "x@x.dev", role: "admin" })).toString("base64url");
    const tampered = `${header}.${payload}.`;
    const res = await request(makeApp()).get("/api/me").set("Authorization", `Bearer ${tampered}`);
    expect(res.status).toBe(401);
  });

  it("rifiuta un Authorization che non comincia con Bearer", async () => {
    const seed = seedMinimal();
    const token = authHeader(seed.ada).replace("Bearer ", "");
    const res = await request(makeApp()).get("/api/me").set("Authorization", `Hola ${token}`);
    expect(res.status).toBe(401);
  });

  it("rifiuta un token scaduto", async () => {
    seedMinimal();
    const expired = jwt.sign(
      { sub: 1, email: "ada@test.dev", role: "admin" },
      config.jwtSecret,
      { expiresIn: "-1h" }
    );
    const res = await request(makeApp()).get("/api/me").set("Authorization", `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });

  it("risponde 401 (non 500) quando manca del tutto l'header Authorization", async () => {
    seedMinimal();
    const res = await request(makeApp()).get("/api/me");
    expect(res.status).toBe(401);
  });

  it("accetta la sessione anche tramite cookie httpOnly 'session'", async () => {
    const seed = seedMinimal();
    const token = authHeader(seed.ada).replace("Bearer ", "");
    const res = await request(makeApp()).get("/api/me").set("Cookie", `session=${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("ada@test.dev");
  });
});
