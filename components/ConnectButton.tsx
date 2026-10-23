"use client";

import { Unplug, Usb } from "lucide-react";
import { BAUD_OPTIONS, useTelemetry } from "@/lib/telemetry";

export function ConnectButton({ size = "md" }: { size?: "md" | "lg" }) {
  const { serial, connectSerial, disconnectSerial } = useTelemetry();
  const open = serial.state === "open";
  const busy = serial.state === "connecting";
  const pad = size === "lg" ? "px-8 py-4 text-lg" : "px-6 py-3.5 text-lg";

  if (open) {
    return (
      <button
        onClick={disconnectSerial}
        className={`flex items-center justify-center gap-3 rounded-xl border border-slate-300/60 transition-colors hover:bg-white/10 ${pad}`}
      >
        <Unplug className="size-5" />
        Desconectar
      </button>
    );
  }

  return (
    <button
      onClick={connectSerial}
      disabled={busy || serial.supported === false}
      className={`flex items-center justify-center gap-3 rounded-xl bg-accent font-medium text-space-950 transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-accent ${pad}`}
    >
      <Usb className="size-5" />
      {busy ? "Conectando…" : "Conectar CubeSat"}
    </button>
  );
}

export function BaudSelect() {
  const { serial, setBaud } = useTelemetry();
  return (
    <label className="flex items-center gap-2 text-sm text-slate-300">
      Velocidad
      <select
        value={serial.baud}
        onChange={(e) => setBaud(Number(e.target.value))}
        disabled={serial.state === "open"}
        className="rounded-lg border border-edge bg-space-900/80 px-3 py-1.5 font-mono text-sm outline-none focus:border-accent disabled:opacity-50"
      >
        {BAUD_OPTIONS.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>
    </label>
  );
}
