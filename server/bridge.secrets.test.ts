import { describe, expect, it } from "vitest";
import { bridgeHealthHandler } from "./bridge-api";

describe("bridge secrets", () => {
  it("serves a sanitized health response when called with the server token", async () => {
    const response = await bridgeHealthHandler(
      new Request("https://bridge.local/api/bridge/health", {
        headers: { authorization: `Bearer ${process.env.ROKU_BRIDGE_API_TOKEN}` },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true });
    expect(body).not.toHaveProperty("password");
    expect(body).not.toHaveProperty("username");
    expect(body).not.toHaveProperty("broker");
  });
});
