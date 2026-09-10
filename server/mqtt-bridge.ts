import mqtt, { type MqttClient } from "mqtt";
import { applyMqttMessage, getBridgeSnapshot } from "./bridge-state";

let client: MqttClient | null = null;
let connected = false;
let connecting = false;
let lastError: string | null = null;
let connectedAt: number | null = null;

function brokerUrl() {
  const host = process.env.MQTT_BROKER_HOST;
  const port = process.env.MQTT_BROKER_PORT || "8084";
  if (!host) throw new Error("MQTT_BROKER_HOST não configurado");
  return `wss://${host}:${port}/mqtt`;
}

function topics() {
  const prefix = (process.env.MQTT_TOPIC_PREFIX || "casa").replace(/\/+$/, "");
  return Array.from({ length: 8 }, (_, index) => `${prefix}/luz${index + 1}`);
}

export function getMqttStatus() {
  return {
    connected,
    connecting,
    lastError,
    connectedAt,
    snapshot: getBridgeSnapshot(),
  };
}

export function startMqttBridge() {
  if (client || connecting) return;
  connecting = true;
  lastError = null;

  client = mqtt.connect(brokerUrl(), {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    protocol: "wss",
    reconnectPeriod: 3000,
    connectTimeout: 10000,
    clean: true,
    clientId: `roku-bridge-${Math.random().toString(16).slice(2, 10)}`,
  });

  client.on("connect", () => {
    connecting = false;
    connected = true;
    connectedAt = Date.now();
    client?.subscribe(topics(), { qos: 1 }, error => {
      if (error) lastError = error.message;
    });
  });

  client.on("message", (topic, payload) => {
    applyMqttMessage(topic, payload);
  });

  client.on("reconnect", () => {
    connecting = true;
    connected = false;
  });

  client.on("offline", () => {
    connected = false;
    connecting = true;
  });

  client.on("error", error => {
    lastError = error.message;
  });

  client.on("close", () => {
    connected = false;
    connecting = false;
  });
}

export function stopMqttBridge() {
  if (!client) return;
  client.end(true);
  client = null;
  connected = false;
  connecting = false;
}

export function publishChannelCommand(channel: number, state: "ON" | "OFF"): Promise<void> {
  if (!client || !connected) return Promise.reject(new Error("MQTT desconectado"));
  const prefix = (process.env.MQTT_TOPIC_PREFIX || "casa").replace(/\/+$/, "");
  const topic = `${prefix}/luz${channel}`;
  return new Promise((resolve, reject) => {
    client!.publish(topic, state, { qos: 1, retain: false }, error => {
      if (error) reject(error);
      else resolve();
    });
  });
}
