"use client";

import { EmptyState } from "@/components/EmptyState";
import { LiveChart } from "@/components/LiveChart";
import { ConnectionTitle } from "@/components/StatusBadge";
import { formatValue } from "@/lib/sensors";
import { useTelemetry } from "@/lib/telemetry";

export default function Telemetria() {
  const { readings, sensors, latest } = useTelemetry();

  return (
    <div className="space-y-6">
      <ConnectionTitle />
      {readings.length === 0 ? (
        <EmptyState />
      ) : (
        <section className="grid gap-5 xl:grid-cols-2">
          {sensors.map((s) => {
            const Icon = s.icon;
            const values = readings.flatMap((r) => (s.key in r.values ? [r.values[s.key]] : []));
            const min = values.length ? Math.min(...values) : undefined;
            const max = values.length ? Math.max(...values) : undefined;
            const current = latest?.[s.key];
            return (
              <article key={s.key} className="panel p-5">
                <header className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-3 text-lg">
                    <Icon className="size-6" style={{ color: s.color }} />
                    {s.label}
                  </h3>
                  <span className="font-mono text-2xl tabular-nums">
                    {current === undefined ? "—" : formatValue(s, current)}
                    {s.unit && <span className="ml-1 text-base text-slate-300">{s.unit}</span>}
                  </span>
                </header>
                <LiveChart readings={readings} sensor={s} height={180} />
                <footer className="mt-2 flex justify-between font-mono text-sm text-slate-300">
                  <span>mín {min === undefined ? "—" : formatValue(s, min)}</span>
                  <span>máx {max === undefined ? "—" : formatValue(s, max)}</span>
                </footer>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
