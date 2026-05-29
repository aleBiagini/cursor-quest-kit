import { describe, it, expect } from "vitest";
import request from "supertest";
import { makeApp, seedMinimal } from "./helpers.js";

describe("smoke: server bootstrap", () => {
  it("risponde su /healthz", async () => {
    const res = await request(makeApp()).get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("redirige / su /login quando non sei loggato", async () => {
    seedMinimal();
    const res = await request(makeApp()).get("/").redirects(0);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/login");
  });
});
