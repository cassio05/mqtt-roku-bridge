import type { Express, Request } from "express";
import { getBridgeSnapshot, waitForBridgeChanges } from "./bridge-state";
import { getMqttStatus, publishChannelCommand } from "./mqtt-bridge";

export function isBridgeAuthorized(request: globalThis.Request): boolean {
  const expected = process.env.ROKU_BRIDGE_API_TOKEN;
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return Boolean(expected && actual && actual === expected);
}

function unauthorized(): globalThis.Response {
  return globalThis.Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

export async function bridgeHealthHandler(request: globalThis.Request): Promise<globalThis.Response> {
  if (!isBridgeAuthorized(request)) return globalThis.Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const status = getMqttStatus();
  return globalThis.Response.json({
    ok: true,
    mqtt: {
      connected: status.connected,
      connecting: status.connecting,
      lastError: status.lastError,
      connectedAt: status.connectedAt,
      topicPrefix: process.env.MQTT_TOPIC_PREFIX ?? "casa",
      channels: status.snapshot.channels,
      version: status.snapshot.version,
      updatedAt: status.snapshot.updatedAt,
    },
    bridge: { uptimeSeconds: Math.floor(process.uptime()) },
  });
}

export async function bridgeStateHandler(request: globalThis.Request): Promise<globalThis.Response> {
  if (!isBridgeAuthorized(request)) return globalThis.Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  return globalThis.Response.json({ ok: true, ...getBridgeSnapshot() });
}

export async function bridgeWaitHandler(request: globalThis.Request): Promise<globalThis.Response> {
  if (!isBridgeAuthorized(request)) return globalThis.Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const since = Number(url.searchParams.get("since") || 0);
  const snapshot = await waitForBridgeChanges(Number.isFinite(since) ? since : 0);
  return globalThis.Response.json({ ok: true, ...snapshot });
}

export async function bridgePublishHandler(request: globalThis.Request): Promise<globalThis.Response> {
  if (!isBridgeAuthorized(request)) return globalThis.Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const body = (await request.json()) as { channel?: unknown; state?: unknown };
    const channel = Number(body.channel);
    const state = String(body.state || "").toUpperCase();
    if (!Number.isInteger(channel) || channel < 1 || channel > 8 || !["ON", "OFF"].includes(state)) {
      return globalThis.Response.json({ ok: false, error: "invalid_command" }, { status: 400 });
    }
    await publishChannelCommand(channel, state as "ON" | "OFF");
    return globalThis.Response.json({ ok: true, channel, state });
  } catch (error) {
    return globalThis.Response.json({ ok: false, error: error instanceof Error ? error.message : "publish_failed" }, { status: 503 });
  }
}

export function registerBridgeRoutes(app: Express) {
  app.get("/api/bridge/health", async (req, res) => forward(req, res, bridgeHealthHandler));
  app.get("/api/bridge/state", async (req, res) => forward(req, res, bridgeStateHandler));
  app.get("/api/bridge/wait", async (req, res) => forward(req, res, bridgeWaitHandler));
  app.post("/api/bridge/publish", async (req, res) => forward(req, res, bridgePublishHandler));
}

async function forward(req: Request, res: import("express").Response, handler: (request: globalThis.Request) => Promise<globalThis.Response>) {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  const request = new globalThis.Request(`${protocol}://${req.get("host")}${req.originalUrl}`, {
    method: req.method,
    headers: new Headers(Object.entries(req.headers).flatMap(([key, value]) => value ? [[key, Array.isArray(value) ? value.join(",") : value]] : [])),
    body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body ?? {}),
  });
  const response = await handler(request);
  const body = await response.text();
  res.status(response.status).set("content-type", response.headers.get("content-type") || "application/json").send(body);
}
