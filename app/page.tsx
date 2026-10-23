"use client";

import { useState } from "react";
import { ChevronDown, Link2, Pause, Play, Save, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { LiveChart } from "@/components/LiveChart";
import { SensorCard } from "@/components/SensorCard";
import { ConnectButton } from "@/components/ConnectButton";
import { ConnectionTitle, StatusDot } from "@/components/StatusBadge";
import { sensorHeader } from "@/lib/sensors";
import { useTelemetry } from "@/lib/telemetry";

export default function Inicio() {
  const { readings, sensors, latest, paused, link, lastSeen, togglePause, saveCsv } = useTelemetry();
  const [selected, setSelected] = useState<string>("");
  const hasData = readings.length > 0;
  const sensor = sensors.find((s) => s.key === selected) ?? sensors[0];
  const live = link === "live";

  const status = [
    { label: "Puerto USB", value: link === "offline" ? "Desconectado" : "Abierto", tone: link === "offline" ? "bad" : "ok" },
    { label: "Conexión con CubeSat", value: live ? "Activa" : hasData ? "Señal perdida" : "Sin señal", tone: live ? "ok" : "warn" },
    {
      label: "Recepción de datos",
      value: !live ? "Sin datos" : paused ? "En pausa" : "Normal",
      tone: live && !paused ? "ok" : "warn",
    },
    { label: "Sensores", value: sensors.length ? `${sensors.length} detectados` : "Ninguno", tone: sensors.length ? "ok" : "idle" },
  ] as const;

  return (
    <div className="space-y-6">
      <ConnectionTitle />

      {!hasData ? (
        <EmptyState />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
            {sensors.map((s) => (
              <SensorCard key={s.key} sensor={s} value={latest?.[s.key]} stale={!live} />
            ))}
          </section>

          <section className="panel p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="flex items-center gap-3 text-xl">
                <TrendingUp className="size-6 text-accent-strong" />
                Datos en tiempo real
              </h3>
              <label className="relative">
                <span className="sr-only">Sensor a graficar</span>
                <select
                  value={sensor.key}
                  onChange={(e) => setSelected(e.target.value)}
                  className="appearance-none rounded-lg border border-edge bg-space-900/80 py-2 pl-4 pr-10 text-base outline-none focus:border-accent"
                >
                  {sensors.map((s) => (
                    <option key={s.key} value={s.key}>
                      {sensorHeader(s)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-slate-300" />
              </label>
            </div>
            <LiveChart readings={readings} sensor={sensor} height={260} />
            {!live && lastSeen && (
              <p className="mt-3 text-sm text-warn">
                Sin señal desde las {new Date(lastSeen).toLocaleTimeString("es-AR", { hour12: false })}. Se muestran los últimos datos recibidos.
              </p>
            )}
          </section>
        </>
      )}

      <section className="grid items-end gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="panel p-5">
          <h3 className="mb-4 flex items-center gap-3 text-xl">
            <Link2 className="size-6 text-accent-strong" />
            Estado del sistema
          </h3>
          <ul className="space-y-3 text-base">
            {status.map((row) => (
              <li key={row.label} className="flex items-center gap-4">
                <StatusDot tone={row.tone} live />
                <span className="flex-1">{row.label}</span>
                <span className={row.tone === "ok" ? "text-ok" : row.tone === "bad" ? "text-bad" : row.tone === "warn" ? "text-warn" : "text-slate-400"}>
                  {row.value}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap justify-end gap-4">
          {hasData && <ConnectButton />}
          <button
            onClick={togglePause}
            disabled={!hasData}
            className="flex min-w-40 items-center justify-center gap-3 rounded-xl border border-slate-300/60 px-6 py-3.5 text-lg transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            {paused ? <Play className="size-5" /> : <Pause className="size-5" />}
            {paused ? "Reanudar" : "Pausar"}
          </button>
          <button
            onClick={saveCsv}
            disabled={!hasData}
            className="flex min-w-52 items-center justify-center gap-3 rounded-xl bg-accent px-6 py-3.5 text-lg font-medium text-space-950 transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-accent"
          >
            <Save className="size-5" />
            Guardar datos
          </button>
        </div>
      </section>
    </div>
  );
}
