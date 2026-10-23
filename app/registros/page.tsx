"use client";

import { Download, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ConnectionTitle } from "@/components/StatusBadge";
import { formatTime, formatValue, sensorHeader } from "@/lib/sensors";
import { useTelemetry } from "@/lib/telemetry";

const VISIBLE_ROWS = 100;

export default function Registros() {
  const { readings, sensors, saveCsv, clear } = useTelemetry();
  const rows = readings.slice(-VISIBLE_ROWS).reverse();

  return (
    <div className="space-y-6">
      <ConnectionTitle />

      {readings.length === 0 ? (
        <EmptyState />
      ) : (
        <section className="panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge p-5">
            <div>
              <h3 className="text-xl">Registros</h3>
              <p className="text-sm text-slate-300">
                {readings.length} lecturas en memoria · mostrando las últimas {rows.length}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={clear}
                className="flex items-center gap-2 rounded-lg border border-slate-300/50 px-4 py-2 transition-colors hover:bg-white/10"
              >
                <Trash2 className="size-4" /> Limpiar
              </button>
              <button
                onClick={saveCsv}
                className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 font-medium text-space-950 transition-colors hover:bg-accent-strong"
              >
                <Download className="size-4" /> Exportar CSV
              </button>
            </div>
          </div>

          <div className="max-h-112 overflow-auto">
            <table className="w-full min-w-136 text-left font-mono text-sm tabular-nums">
              <thead className="sticky top-0 bg-space-900 text-slate-300">
                <tr>
                  <th className="px-5 py-3 font-medium">Hora</th>
                  {sensors.map((s) => (
                    <th key={s.key} className="whitespace-nowrap px-5 py-3 text-right font-medium">
                      {sensorHeader(s)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.ts} className="border-t border-edge/60 hover:bg-white/5">
                    <td className="px-5 py-2.5">{formatTime(r.ts)}</td>
                    {sensors.map((s) => (
                      <td key={s.key} className="px-5 py-2.5 text-right">
                        {s.key in r.values ? formatValue(s, r.values[s.key]) : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
