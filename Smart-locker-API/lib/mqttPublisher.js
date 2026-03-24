// Smart-locker-API/lib/mqttPublisher.js
const mqtt = require("mqtt");
const crypto = require("crypto");

const MQTT_BROKER_HOST = process.env.MQTT_BROKER_HOST;
const MQTT_BROKER_PORT = Number(process.env.MQTT_BROKER_PORT || 8883);
const MQTT_USERNAME = process.env.MQTT_USERNAME;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD;
const clientId =
  process.env.MQTT_CLIENT_ID ||
  `smartlocker-web-${process.pid}-${crypto.randomBytes(4).toString("hex")}`;

let client = null;
let isConnected = false;

function initMqtt() {
  if (client) return client;

  if (!MQTT_BROKER_HOST || !MQTT_USERNAME || !MQTT_PASSWORD) {
    console.warn("[MQTT] Missing broker credentials. Publisher disabled.");
    return null;
  }

  const brokerUrl = `mqtts://${MQTT_BROKER_HOST}:${MQTT_BROKER_PORT}`;
  client = mqtt.connect(brokerUrl, {
    clientId,
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
    reconnectPeriod: 2000,
    clean: false,
    keepalive: 60,
  });

  client.on("connect", () => {
    isConnected = true;
    console.log("[MQTT] Connected");
  });

  client.on("reconnect", () => {
    console.log("[MQTT] Reconnecting...");
  });

  client.on("close", () => {
    isConnected = false;
    console.log("[MQTT] Connection closed");
  });

  client.on("error", (err) => {
    console.error("[MQTT] Error:", err.message);
  });

  return client;
}

function makeEvent(payload) {
  return {
    event_id: crypto.randomUUID(),
    payload,
  };
}

function publishEvent(topic, payload, qos = 1) {
  return new Promise((resolve, reject) => {
    const c = initMqtt();
    if (!c) return resolve({ skipped: true, reason: "mqtt_not_configured" });

    const message = JSON.stringify(makeEvent(payload));

    c.publish(topic, message, { qos }, (err) => {
      if (err) return reject(err);
      resolve({ ok: true, topic, connected: isConnected });
    });
  });
}

module.exports = {
  initMqtt,
  publishEvent,
};
