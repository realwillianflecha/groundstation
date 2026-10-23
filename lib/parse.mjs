// Convierte una línea de texto del CubeSat en { values, units }.
//   values: { clave: número }     units: { clave: "unidad" } (solo si la línea la trae)
// Acepta JSON, "clave=valor", "Clave (detalle): valor unidad" y CSV numérico. Devuelve null si no hay datos.

const NAME = "[A-Za-zÁÉÍÓÚáéíóúÑñ_][A-Za-zÁÉÍÓÚáéíóúÑñ_ ]*?(?:\\s*\\([^)]*\\))?";
const UNIT = "(?:\\s*([%°µ][A-Za-z]*|[A-Za-z/]{1,6}))?";
const PAIR = new RegExp(`(${NAME})\\s*[:=]\\s*(-?\\d+(?:[.,]\\d+)?)${UNIT}`, "g");

// El ESP32 imprime un mensaje de arranque (rst:0x1, configsip, clk_drv, load:0x...) cada vez que se reinicia.
// Nunca son lecturas de sensores, así que se descartan: líneas con valores hexadecimales o con esas cabeceras.
const BOOT_NOISE = /0x[0-9a-f]+|^(ets |rst:|configsip|clk_drv|mode:|load:|entry |esp-rom:|build:)/i;

function toNumber(v) {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") return Number(v.replace(",", "."));
  return NaN;
}

export function parseLine(raw) {
  const line = raw.trim();
  if (!line || BOOT_NOISE.test(line)) return null;

  if (line.startsWith("{")) {
    try {
      const values = {};
      for (const [key, v] of Object.entries(JSON.parse(line))) {
        const n = toNumber(v);
        if (Number.isFinite(n)) values[key] = n;
      }
      return Object.keys(values).length ? { values, units: {} } : null;
    } catch {
      // JSON incompleto o corrupto: se prueba como texto
    }
  }

  const values = {};
  const units = {};
  for (const m of line.matchAll(PAIR)) {
    const key = m[1].trim();
    values[key] = Number(m[2].replace(",", "."));
    if (m[3]) units[key] = m[3];
  }
  if (Object.keys(values).length) return { values, units };

  const parts = line.split(/[;,\t ]+/).filter(Boolean);
  if (parts.length && parts.every((p) => Number.isFinite(Number(p)))) {
    return { values: Object.fromEntries(parts.map((p, i) => [`valor_${i + 1}`, Number(p)])), units: {} };
  }
  return null;
}
