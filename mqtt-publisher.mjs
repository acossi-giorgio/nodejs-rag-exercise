/**
 * MQTT Sensor Publisher
 *
 * Publishes random temperature and humidity readings to their respective topics.
 *
 * Usage:
 *   node mqtt-publisher.mjs [options]
 *
 * Options:
 *   --broker      MQTT broker URL              (default: mqtt://localhost:1883)
 *   --device      Device ID in the payload     (default: "simulator-01")
 *   --interval    Publish interval in ms       (default: 2000)
 *   --temp-min    Min temperature value        (default: 15)
 *   --temp-max    Max temperature value        (default: 40)
 *   --hum-min     Min humidity value           (default: 20)
 *   --hum-max     Max humidity value           (default: 90)
 *
 * Examples:
 *   node mqtt-publisher.mjs
 *   node mqtt-publisher.mjs --broker mqtt://localhost:1883 --interval 1000 --temp-min 20 --temp-max 35
 */

import mqtt from "mqtt";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
      args[key] = val;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

const BROKER = args["broker"] ?? "mqtt://localhost:1883";
const DEVICE = args["device"] ?? "simulator-01";
const INTERVAL = Number(args["interval"] ?? 2000);
const TEMP_MIN = Number(args["temp-min"] ?? 15);
const TEMP_MAX = Number(args["temp-max"] ?? 40);
const HUM_MIN = Number(args["hum-min"] ?? 20);
const HUM_MAX = Number(args["hum-max"] ?? 90);

function randFloat(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function buildPayload(value, unit) {
  return JSON.stringify({
    deviceId:  DEVICE,
    value,
    unit,
    timestamp: new Date().toISOString(),
  });
}

console.log(`Connecting to broker: ${BROKER}`);

const client = mqtt.connect(BROKER, {
  clientId: `mqtt-publisher-${Math.random().toString(16).slice(2, 8)}`,
  clean: true,
  reconnectPeriod: 5000,
});

client.on("connect", () => {
  console.log(`Connected. Publishing every ${INTERVAL}ms`);
  console.log(`Temperature range: [${TEMP_MIN}, ${TEMP_MAX}] °C`);
  console.log(`Humidity range: [${HUM_MIN}, ${HUM_MAX}] %`);

  setInterval(() => {
    const temp    = randFloat(TEMP_MIN, TEMP_MAX);
    const humid   = randFloat(HUM_MIN, HUM_MAX);
    const tempMsg = buildPayload(temp, "°C");
    const humMsg  = buildPayload(humid, "%");

    client.publish("temperature", tempMsg, { qos: 1 }, (err) => {
      if (err) console.error("Error publishing temperature:", err.message);
      else console.log(`[temperature] ${tempMsg}`);
    });

    client.publish("humidity", humMsg, { qos: 1 }, (err) => {
      if (err) console.error("Error publishing humidity:", err.message);
      else console.log(`[humidity] ${humMsg}`);
    });
  }, INTERVAL);
});

client.on("error", (err) => {
  console.error("MQTT error:", err.message);
});

client.on("reconnect", () => {
  console.log("Reconnecting...");
});

process.on("SIGINT", () => {
  console.log("\nDisconnecting...");
  client.end();
  process.exit(0);
});
