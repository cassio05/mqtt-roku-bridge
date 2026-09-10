export type ChannelState = "ON" | "OFF";

export type BridgeChannel = {
  channel: number;
  topic: string;
  state: ChannelState;
  updatedAt: number | null;
};

export type BridgeSnapshot = {
  version: number;
  updatedAt: number | null;
  channels: BridgeChannel[];
};

type Waiter = {
  since: number;
  resolve: (snapshot: BridgeSnapshot) => void;
  timer: ReturnType<typeof setTimeout>;
};

const DEFAULT_CHANNELS = Array.from({ length: 8 }, (_, index) => index + 1);
const topicPrefix = () => (process.env.MQTT_TOPIC_PREFIX || "casa").replace(/\/+$/, "");
const channels = new Map<number, BridgeChannel>();
const waiters = new Set<Waiter>();
let version = 0;
let lastEventAt: number | null = null;

function ensureChannels() {
  for (const channel of DEFAULT_CHANNELS) {
    if (!channels.has(channel)) {
      channels.set(channel, {
        channel,
        topic: `${topicPrefix()}/luz${channel}`,
        state: "OFF",
        updatedAt: null,
      });
    }
  }
}

export function normalizeState(value: unknown): ChannelState | null {
  if (typeof value === "boolean") return value ? "ON" : "OFF";
  if (typeof value === "number") return value === 1 ? "ON" : value === 0 ? "OFF" : null;
  if (typeof value !== "string") return null;

  const normalized = value.trim().toUpperCase();
  if (["ON", "1", "TRUE", "LIGADO", "LIGA"].includes(normalized)) return "ON";
  if (["OFF", "0", "FALSE", "DESLIGADO", "DESLIGA"].includes(normalized)) return "OFF";
  return null;
}

export function topicToChannel(topic: string): number | null {
  const match = topic.trim().match(new RegExp(`^${topicPrefix().replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}/luz([1-8])$`, "i"));
  return match ? Number(match[1]) : null;
}

export function normalizeMqttMessage(payload: Uint8Array | string | unknown): ChannelState | null {
  let value: unknown = payload;
  if (payload instanceof Uint8Array) value = new TextDecoder().decode(payload);
  if (typeof value === "string") {
    const text = value.trim();
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      value = parsed.state ?? parsed.status ?? parsed.value ?? parsed.payload ?? text;
    } catch {
      value = text;
    }
  }
  return normalizeState(value);
}

export function getBridgeSnapshot(): BridgeSnapshot {
  ensureChannels();
  return {
    version,
    updatedAt: lastEventAt,
    channels: Array.from(channels.values()).map(channel => ({ ...channel })),
  };
}

function resolveWaiters() {
  const snapshot = getBridgeSnapshot();
  for (const waiter of Array.from(waiters)) {
    if (snapshot.version > waiter.since) {
      clearTimeout(waiter.timer);
      waiters.delete(waiter);
      waiter.resolve(snapshot);
    }
  }
}

export function applyMqttMessage(topic: string, payload: Uint8Array | string): boolean {
  const channelNumber = topicToChannel(topic);
  if (!channelNumber) return false;
  const state = normalizeMqttMessage(payload);
  if (!state) return false;

  ensureChannels();
  const previous = channels.get(channelNumber)!;
  const now = Date.now();
  channels.set(channelNumber, {
    ...previous,
    state,
    updatedAt: now,
  });
  version += 1;
  lastEventAt = now;
  resolveWaiters();
  return true;
}

export function waitForBridgeChanges(since: number, timeoutMs = 25000): Promise<BridgeSnapshot> {
  const current = getBridgeSnapshot();
  if (current.version > since) return Promise.resolve(current);

  return new Promise(resolve => {
    const waiter: Waiter = {
      since,
      resolve,
      timer: setTimeout(() => {
        waiters.delete(waiter);
        resolve(getBridgeSnapshot());
      }, Math.max(1000, Math.min(timeoutMs, 30000))),
    };
    waiters.add(waiter);
  });
}
