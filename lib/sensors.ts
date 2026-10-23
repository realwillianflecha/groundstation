import {
  Activity,
  Cloud,
  Droplet,
  Gauge,
  Mountain,
  Sun,
  Thermometer,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Una lectura: hora de recepción y un valor por cada sensor que el CubeSat reportó. */
export type Reading = { ts: number; values: Record<string, number> };

export type SensorMeta = {
  key: string;
  label: string;
  unit: string;
  /** Si falta, se muestran hasta 2 decimales sin ceros sobrantes */
  decimals?: number;
  icon: LucideIcon;
  color: string;
};

type CatalogEntry = Omit<SensorMeta, "key"> & { aliases: string[] };

// Sensores conocidos. Cualquier clave que no esté acá igual se muestra, con ícono genérico.
const CATALOG: CatalogEntry[] = [
  { aliases: ["t", "temp", "temperatura", "temperature"], label: "Temperatura", unit: "°C", decimals: 1, icon: Thermometer, color: "#60a5fa" },
  { aliases: ["h", "hum", "humedad", "humidity"], label: "Humedad", unit: "%", decimals: 1, icon: Droplet, color: "#38bdf8" },
  { aliases: ["p", "pres", "presion", "pressure", "hpa"], label: "Presión", unit: "hPa", decimals: 1, icon: Gauge, color: "#a78bfa" },
  { aliases: ["l", "luz", "lux", "light", "ldr"], label: "Luz", unit: "lux", decimals: 0, icon: Sun, color: "#fbbf24" },
  { aliases: ["v", "volt", "voltaje", "voltage", "bat", "bateria", "battery"], label: "Voltaje", unit: "V", decimals: 2, icon: Zap, color: "#4ade80" },
  { aliases: ["alt", "altitud", "altitude"], label: "Altitud", unit: "m", decimals: 1, icon: Mountain, color: "#f472b6" },
  { aliases: ["co2"], label: "CO₂", unit: "ppm", decimals: 0, icon: Cloud, color: "#94a3b8" },
  { aliases: ["gas", "mq2", "mq135"], label: "Gas", unit: "ppm", decimals: 0, icon: Wind, color: "#2dd4bf" },
];

const FALLBACK_COLORS = ["#fb923c", "#c084fc", "#34d399", "#f87171", "#facc15", "#22d3ee"];

function normalize(key: string) {
  return key
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function prettify(key: string) {
  const text = key.replace(/[_-]+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** `reportedUnit` es la unidad que trae el propio CubeSat; si existe, manda sobre la del catálogo. */
export function resolveSensor(key: string, index: number, reportedUnit?: string): SensorMeta {
  const norm = normalize(key);
  // Coincide "temp" o "temperatura", y también variantes como "Temperatura (BMP)" o "Altitud Aprox".
  const known = CATALOG.find((c) => c.aliases.some((a) => norm === a || (a.length >= 4 && norm.startsWith(`${a}_`))));
  const base = known ?? { label: prettify(key), unit: "", icon: Activity, color: FALLBACK_COLORS[index % FALLBACK_COLORS.length] };
  return { ...base, key, unit: reportedUnit ?? base.unit };
}

export function formatValue(sensor: SensorMeta, value: number) {
  return sensor.decimals === undefined ? String(Number(value.toFixed(2))) : value.toFixed(sensor.decimals);
}

export function sensorHeader(sensor: SensorMeta) {
  return sensor.unit ? `${sensor.label} (${sensor.unit})` : sensor.label;
}

export function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("es-AR", { hour12: false });
}
