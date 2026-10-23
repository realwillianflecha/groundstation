// Puente: recibe datos del CubeSat (USB serie y/o Wi-Fi UDP) y los reenvía a la app por WebSocket.
//
//   node bridge/server.mjs            USB (autodetecta) + Wi-Fi
//   node bridge/server.mjs --mock     además, datos de prueba
//
// Variables opcionales: PORT=COM3  BAUD=115200  UDP_PORT=4210  WS_PORT=8080  NAME=CubeSat-01

import dgram from "node:dgram";
import { SerialPort, ReadlineParser } from "serialport";
import { WebSocketServer } from "ws";
import { parseLine } from "../lib/parse.mjs";

const MOCK = process.argv.includes("--mock");
const NAME = process.env.NAME ?? "CubeSat-01";
const WS_PORT = Number(process.env.WS_PORT ?? 8080);
const UDP_PORT = Number(process.env.UDP_PORT ?? 4210);
const BAUD = Number(process.env.BAUD ?? 115200);
const WANTED_PORT = process.env.PORT;
const FLUSH_MS = 200;
// Fabricantes comunes de placas Arduino/ESP32 (Arduino, CH340, CP210x, FTDI)
const KNOWN_VENDORS = new Set(["2341", "2a03", "1a86", "10c4", "0403"]);

const log = (...args) => console.log("[puente]", ...args);

const status = {
  type: "status",
  name: NAME,
  mock: MOCK,
  serial: { state: "searching", path: null, baud: BAUD },
  udp: { state: "starting", port: UDP_PORT },
};

// ---------- WebSocket hacia la app ----------
const wss = new WebSocketServer({ port: WS_PORT });
wss.on("listening", () => log(`App: ws://localhost:${WS_PORT}`));
wss.on("error", (err) => {
  log(err.code === "EADDRINUSE" ? `El puerto ${WS_PORT} ya está en uso (¿puente ya abierto?)` : err.message);
  process.exit(1);
});
wss.on("connection", (client) => client.send(JSON.stringify(status)));

function broadcast(message) {
  const text = JSON.stringify(message);
  for (const client of wss.clients) if (client.readyState === 1) client.send(text);
}

let lastStatus = JSON.stringify(status);
function updateStatus(section, patch) {
  Object.assign(status[section], patch);
  const text = JSON.stringify(status);
  if (text === lastStatus) return;
  lastStatus = text;
  broadcast(status);
}

// ---------- Entrada de datos (junta líneas cercanas en una sola lectura) ----------
let pending = { values: {}, units: {} };
let flushTimer = null;

function ingest({ values, units = {} }) {
  Object.assign(pending.values, values);
  Object.assign(pending.units, units);
  flushTimer ??= setTimeout(() => {
    broadcast({ type: "reading", ...pending });
    pending = { values: {}, units: {} };
    flushTimer = null;
  }, FLUSH_MS);
}

function ingestLine(line) {
  const parsed = parseLine(line);
  if (parsed) ingest(parsed);
}

// ---------- USB serie ----------
async function pickPort() {
  if (WANTED_PORT) return WANTED_PORT;
  const ports = await SerialPort.list();
  return ports.find((p) => KNOWN_VENDORS.has((p.vendorId ?? "").toLowerCase()))?.path ?? null;
}

let serial = null;
async function connectSerial() {
  if (serial) return;
  let path;
  try {
    path = await pickPort();
  } catch (err) {
    return updateStatus("serial", { state: "error", path: null, error: err.message });
  }
  if (!path) return updateStatus("serial", { state: "searching", path: null, error: undefined });

  const port = new SerialPort({ path, baudRate: BAUD, autoOpen: false });
  serial = port;
  port.pipe(new ReadlineParser({ delimiter: "\n" })).on("data", ingestLine);
  port.on("close", () => {
    serial = null;
    updateStatus("serial", { state: "searching", path: null });
  });
  port.on("error", (err) => updateStatus("serial", { state: "error", error: err.message }));
  port.open((err) => {
    if (err) {
      serial = null;
      const busy = /access denied|busy|permission/i.test(err.message);
      updateStatus("serial", {
        state: "error",
        path,
        error: busy ? "Puerto ocupado (cerrá el Monitor Serie del Arduino IDE)" : err.message,
      });
      return;
    }
    log(`USB abierto: ${path} @ ${BAUD}`);
    updateStatus("serial", { state: "open", path, error: undefined });
  });
}
connectSerial();
setInterval(connectSerial, 3000);

// ---------- Wi-Fi (UDP) ----------
const udp = dgram.createSocket({ type: "udp4", reuseAddr: true });
udp.on("message", (msg) => msg.toString().split(/\r?\n/).forEach(ingestLine));
udp.on("error", (err) => updateStatus("udp", { state: "error", error: err.message }));
udp.bind(UDP_PORT, () => {
  log(`Wi-Fi escuchando en UDP ${UDP_PORT}`);
  updateStatus("udp", { state: "listening" });
});

// ---------- Datos de prueba ----------
if (MOCK) {
  log("Modo prueba: generando datos simulados");
  const base = { temp: [32, 0.6], hum: [78, 1.2], pres: [1012.6, 0.5], luz: [640, 30], volt: [5.02, 0.03] };
  const current = Object.fromEntries(Object.entries(base).map(([k, [v]]) => [k, v]));
  const startedAt = Date.now();
  setInterval(() => {
    for (const [k, [mid, step]] of Object.entries(base)) {
      current[k] += (Math.random() - 0.5) * step + (mid - current[k]) * 0.05;
    }
    const extra = Date.now() - startedAt > 15000 ? { altitud: 120 + Math.random() * 3 } : {};
    ingest({ values: { ...current, ...extra } });
  }, 1000);
}
