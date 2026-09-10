import { describe, expect, it } from "vitest";
import {
  applyMqttMessage,
  getBridgeSnapshot,
  normalizeMqttMessage,
  normalizeState,
  waitForBridgeChanges,
} from "./bridge-state";

describe("bridge state", () => {
  it("normalizes common ON/OFF payloads", () => {
    expect(normalizeState(" on ")).toBe("ON");
    expect(normalizeState("desligado")).toBe("OFF");
    expect(normalizeMqttMessage('{"state":"TRUE"}')).toBe("ON");
    expect(normalizeMqttMessage(new TextEncoder().encode("0"))).toBe("OFF");
    expect(normalizeState("unknown")).toBeNull();
  });

  it("keeps the latest state for a channel and wakes long-polling", async () => {
    const before = getBridgeSnapshot();
    expect(applyMqttMessage("casa/luz1", "ON")).toBe(true);
    const after = getBridgeSnapshot();
    expect(after.version).toBeGreaterThan(before.version);
    expect(after.channels.find(channel => channel.channel === 1)?.state).toBe("ON");

    const pending = waitForBridgeChanges(after.version);
    applyMqttMessage("casa/luz2", '{"status":"off"}');
    const changed = await pending;
    expect(changed.version).toBeGreaterThan(after.version);
    expect(changed.channels.find(channel => channel.channel === 2)?.state).toBe("OFF");
    expect(changed.channels).toHaveLength(8);
  });
});
