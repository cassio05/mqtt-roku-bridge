import { describe, expect, it } from "vitest";
import { bridgePublishHandler, bridgeStateHandler, bridgeWaitHandler } from "./bridge-api";
import { applyMqttMessage, getBridgeSnapshot } from "./bridge-state";

const auth = { authorization: `Bearer ${process.env.ROKU_BRIDGE_API_TOKEN}` };

describe("bridge API", () => {
  it("returns the current sanitized channel state", async () => {
    applyMqttMessage("casa/luz3", "ON");
    const response = await bridgeStateHandler(new Request("https://bridge.local/api/bridge/state", { headers: auth }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.channels).toHaveLength(8);
    expect(body.channels.find((channel: { channel: number }) => channel.channel === 3).state).toBe("ON");
  });

  it("returns an immediate long-poll response after a newer state version", async () => {
    const current = getBridgeSnapshot();
    applyMqttMessage("casa/luz4", "OFF");
    const response = await bridgeWaitHandler(new Request(`https://bridge.local/api/bridge/wait?since=${current.version}`, { headers: auth }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.version).toBeGreaterThan(current.version);
  });

  it("protects publish and returns a controlled unavailable response", async () => {
    const response = await bridgePublishHandler(new Request("https://bridge.local/api/bridge/publish", {
      method: "POST",
      headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify({ channel: 1, state: "ON" }),
    }));
    expect([200, 503]).toContain(response.status);
    const body = await response.json();
    expect(body).not.toHaveProperty("password");
  });
});
