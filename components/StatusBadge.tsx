"use client";

import { useTelemetry, type Link } from "@/lib/telemetry";

export function StatusDot({ tone, live = false }: { tone: "ok" | "warn" | "bad" | "idle"; live?: boolean }) {
  const color = { ok: "bg-ok", warn: "bg-warn", bad: "bg-bad", idle: "bg-slate-500" }[tone];
  return <span className={`inline-block size-3.5 shrink-0 rounded-full ${color} ${live && tone === "ok" ? "dot-live" : ""}`} />;
}

export function linkSummary(link: Link, paused: boolean, hasData: boolean) {
  if (link === "offline") return { tone: "bad", label: "Desconectado" } as const;
  if (link === "live") return paused ? ({ tone: "warn", label: "Pausado" } as const) : ({ tone: "ok", label: "Conectado" } as const);
  return { tone: "warn", label: hasData ? "Señal perdida" : "Esperando señal" } as const;
}

export function ConnectionTitle() {
  const { link, paused, bridge, readings } = useTelemetry();
  const hasData = readings.length > 0;
  const { tone, label } = linkSummary(link, paused, hasData);
  const color = { ok: "text-ok", warn: "text-warn", bad: "text-bad" }[tone];

  return (
    <div>
      <h2 className="text-3xl font-semibold tracking-tight text-accent-strong sm:text-4xl">
        {hasData ? (bridge?.name ?? "CubeSat") : "Sin CubeSat"}
      </h2>
      <p className={`mt-1 flex items-center gap-2.5 text-lg ${color}`}>
        <StatusDot tone={tone} live />
        {label}
      </p>
    </div>
  );
}
