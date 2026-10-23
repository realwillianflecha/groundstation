"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { parseLine } from "./parse.mjs";
import { formatTime, formatValue, resolveSensor, sensorHeader, type Reading, type SensorMeta } from "./sensors";

const MAX_READINGS = 3600;
/** Sin datos durante este tiempo = se perdió la señal del CubeSat */
const STALE_MS = 5000;
const RECONNECT_MS = 2000;
/** Las líneas que llegan juntas (un bloque de varias líneas) se unen en una sola lectura */
const FLUSH_MS = 200;
/** Un sensor se muestra mientras haya llegado en alguna de las últimas N lecturas */
const ACTIVE_WINDOW = 20;

export const BAUD_OPTIONS = [9600, 19200, 57600, 115200];
const DEFAULT_BAUD = 115200;

export type BridgeStatus = {
  name: string;
  mock: boolean;
  serial: { state: "searching" | "open" | "error"; path: string | null; baud: number; error?: string };
  udp: { state: "starting" | "listening" | "error"; port: number; error?: string };
};

export type SerialState = "closed" | "connecting" | "open" | "error";

/** offline: ninguna fuente conectada · waiting: fuente conectada, sin datos recientes · live: recibiendo datos */
export type Link = "offline" | "waiting" | "live";

type Values = Record<string, number>;
type Units = Record<string, string>;

type Telemetry = {
  readings: Reading[];
  sensors: SensorMeta[];
  latest: Values | null;
  paused: boolean;
  link: Link;
  /** Hora de la última lectura recibida (aunque esté en pausa) */
  lastSeen: number | null;
  /** Conexión USB directa desde el navegador (Web Serial) */
  serial: { supported: boolean | null; state: SerialState; error?: string; baud: number };
  connectSerial: () => Promise<void>;
  disconnectSerial: () => Promise<void>;
  setBaud: (baud: number) => void;
  /** Puente local opcional (se activa abriendo la app con ?puente) */
  bridge: BridgeStatus | null;
  bridgeUrl: string | null;
  togglePause: () => void;
  saveCsv: () => void;
  clear: () => void;
};

const TelemetryContext = createContext<Telemetry | null>(null);

function bridgeTarget() {
  const fromEnv = process.env.NEXT_PUBLIC_BRIDGE_URL;
  if (fromEnv) return fromEnv;
  if (!new URLSearchParams(window.location.search).has("puente")) return null;
  return `ws://${window.location.hostname || "localhost"}:8080`;
}

function serialErrorText(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return /open|busy|access|denied/i.test(msg)
    ? "No se pudo abrir el puerto: seguramente está ocupado. Cerrá el Monitor Serie del Arduino IDE y otras pestañas que lo usen."
    : msg;
}

export function TelemetryProvider({ children }: { children: ReactNode }) {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [keys, setKeys] = useState<string[]>([]);
  const [units, setUnits] = useState<Units>({});
  const [paused, setPaused] = useState(false);
  const [lastSeen, setLastSeen] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  const [serialSupported, setSerialSupported] = useState<boolean | null>(null);
  const [serialState, setSerialState] = useState<SerialState>("closed");
  const [serialError, setSerialError] = useState<string>();
  const [baud, setBaudState] = useState(DEFAULT_BAUD);

  const [socketOpen, setSocketOpen] = useState(false);
  const [bridge, setBridge] = useState<BridgeStatus | null>(null);
  const [bridgeUrl, setBridgeUrl] = useState<string | null>(null);

  const pausedRef = useRef(false);
  const baudRef = useRef(DEFAULT_BAUD);
  const closerRef = useRef<(() => Promise<void>) | null>(null);
  const portRef = useRef<SerialPort | null>(null);
  const pendingRef = useRef<{ values: Values; units: Units }>({ values: {}, units: {} });
  const flushRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    baudRef.current = baud;
  }, [baud]);

  // Reloj interno para detectar cuando el CubeSat deja de enviar datos.
  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const pushReading = useCallback((values: Values, newUnits: Units) => {
    const ts = Date.now();
    setLastSeen(ts);
    if (pausedRef.current) return;
    const incoming = Object.keys(values);
    setKeys((known) => (incoming.some((k) => !known.includes(k)) ? [...known, ...incoming.filter((k) => !known.includes(k))] : known));
    if (Object.keys(newUnits).length) setUnits((known) => ({ ...known, ...newUnits }));
    setReadings((all) => [...all, { ts, values }].slice(-MAX_READINGS));
  }, []);

  const ingestLine = useCallback(
    (line: string) => {
      const parsed = parseLine(line);
      if (!parsed) return;
      Object.assign(pendingRef.current.values, parsed.values);
      Object.assign(pendingRef.current.units, parsed.units);
      flushRef.current ??= setTimeout(() => {
        const { values, units: u } = pendingRef.current;
        pendingRef.current = { values: {}, units: {} };
        flushRef.current = null;
        pushReading(values, u);
      }, FLUSH_MS);
    },
    [pushReading],
  );

  // ---------- USB directo desde el navegador (Web Serial) ----------
  const openPort = useCallback(
    async (port: SerialPort) => {
      setSerialState("connecting");
      setSerialError(undefined);
      try {
        await port.open({ baudRate: baudRef.current });
      } catch (e) {
        setSerialState("error");
        setSerialError(serialErrorText(e));
        return;
      }

      const reader = port.readable!.getReader();
      const decoder = new TextDecoder();
      const closer = async () => {
        try {
          await reader.cancel();
        } catch {}
        try {
          reader.releaseLock();
        } catch {}
        try {
          await port.close();
        } catch {}
      };
      closerRef.current = closer;
      portRef.current = port;
      setSerialState("open");

      let failure: string | undefined;
      let buffer = "";
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          lines.forEach(ingestLine);
        }
      } catch {
        failure = "Se perdió la conexión con el puerto (¿se desenchufó el cable?).";
      }

      // Si lo cerró el usuario, closerRef ya no apunta a este cierre y no hay nada más que hacer.
      if (closerRef.current === closer) {
        closerRef.current = null;
        await closer();
        setSerialState(failure ? "error" : "closed");
        setSerialError(failure);
      }
    },
    [ingestLine],
  );

  const connectSerial = useCallback(async () => {
    if (!navigator.serial || closerRef.current) return;
    try {
      const port = await navigator.serial.requestPort();
      await openPort(port);
    } catch (e) {
      if (e instanceof DOMException && e.name === "NotFoundError") return; // el usuario cerró la ventana de selección
      setSerialState("error");
      setSerialError(serialErrorText(e));
    }
  }, [openPort]);

  const disconnectSerial = useCallback(async () => {
    const closer = closerRef.current;
    closerRef.current = null;
    await closer?.();
    // Olvida el permiso: la próxima vez hay que volver a elegir el puerto.
    await portRef.current?.forget().catch(() => {});
    portRef.current = null;
    // La app vuelve al estado inicial: sin datos, sin sensores, sin pausa.
    if (flushRef.current) clearTimeout(flushRef.current);
    flushRef.current = null;
    pendingRef.current = { values: {}, units: {} };
    setReadings([]);
    setKeys([]);
    setUnits({});
    setLastSeen(null);
    setPaused(false);
    setSerialState("closed");
    setSerialError(undefined);
  }, []);

  const setBaud = useCallback((value: number) => setBaudState(value), []);

  // Web Serial solo existe en Chrome/Edge de escritorio. No se reconecta solo: siempre se elige el puerto.
  useEffect(() => {
    const id = setTimeout(() => setSerialSupported("serial" in navigator), 0);
    return () => clearTimeout(id);
  }, []);

  // ---------- Puente local opcional (WebSocket) ----------
  useEffect(() => {
    const target = bridgeTarget();
    if (!target) return;
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout>;
    let closed = false;
    setTimeout(() => setBridgeUrl(target), 0);

    const connect = () => {
      socket = new WebSocket(target);
      socket.onopen = () => setSocketOpen(true);
      socket.onerror = () => socket?.close();
      socket.onclose = () => {
        setSocketOpen(false);
        setBridge(null);
        if (!closed) retry = setTimeout(connect, RECONNECT_MS);
      };
      socket.onmessage = (event) => {
        let msg;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }
        if (msg.type === "status") setBridge(msg);
        else if (msg.type === "reading" && msg.values) pushReading(msg.values, msg.units ?? {});
      };
    };

    connect();
    return () => {
      closed = true;
      clearTimeout(retry);
      socket?.close();
    };
  }, [pushReading]);

  // Solo se muestran los sensores que siguen llegando; lo que apareció una vez y no volvió se oculta.
  const sensors = useMemo(() => {
    const recent = readings.slice(-ACTIVE_WINDOW);
    return keys
      .map((key, i) => resolveSensor(key, i, units[key]))
      .filter((s) => recent.some((r) => s.key in r.values));
  }, [keys, units, readings]);

  const sourceOpen = serialState === "open" || socketOpen;
  const link: Link = !sourceOpen ? "offline" : lastSeen !== null && now - lastSeen < STALE_MS ? "live" : "waiting";

  const togglePause = useCallback(() => setPaused((p) => !p), []);
  const clear = useCallback(() => {
    setReadings([]);
    setKeys([]);
    setUnits({});
  }, []);

  const saveCsv = useCallback(() => {
    // Formato para Excel en español: separador ";", coma decimal y BOM para que respete los acentos y el "°".
    const header = ["fecha", "hora", ...sensors.map(sensorHeader)].map((h) => `"${h}"`).join(";");
    const rows = readings.map((r) =>
      [
        new Date(r.ts).toLocaleDateString("es-AR"),
        formatTime(r.ts),
        ...sensors.map((s) => (s.key in r.values ? formatValue(s, r.values[s.key]).replace(".", ",") : "")),
      ].join(";"),
    );
    const blob = new Blob(["﻿" + [header, ...rows].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cubesat_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [readings, sensors]);

  const value = useMemo<Telemetry>(
    () => ({
      readings,
      sensors,
      latest: readings.at(-1)?.values ?? null,
      paused,
      link,
      lastSeen,
      serial: { supported: serialSupported, state: serialState, error: serialError, baud },
      connectSerial,
      disconnectSerial,
      setBaud,
      bridge,
      bridgeUrl,
      togglePause,
      saveCsv,
      clear,
    }),
    [
      readings, sensors, paused, link, lastSeen, serialSupported, serialState, serialError, baud,
      connectSerial, disconnectSerial, setBaud, bridge, bridgeUrl, togglePause, saveCsv, clear,
    ],
  );

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
}

export function useTelemetry() {
  const ctx = useContext(TelemetryContext);
  if (!ctx) throw new Error("useTelemetry debe usarse dentro de <TelemetryProvider>");
  return ctx;
}
