"use client";

import { BaudSelect, ConnectButton } from "@/components/ConnectButton";
import { ConnectionTitle, StatusDot } from "@/components/StatusBadge";
import { useTelemetry } from "@/lib/telemetry";

function Row({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" | "bad" | "idle" }) {
  return (
    <div className="flex items-center gap-3 border-t border-edge/60 py-3 first:border-t-0">
      <span className="flex-1 text-slate-300">{label}</span>
      <span className="flex items-center gap-2 text-sm">
        {value}
        {tone && <StatusDot tone={tone} />}
      </span>
    </div>
  );
}

const SERIAL_TEXT = {
  closed: ["Sin conectar", "idle"],
  connecting: ["Conectando…", "warn"],
  open: ["Conectado", "ok"],
  error: ["Error", "bad"],
} as const;

export default function Configuracion() {
  const { serial, bridge, bridgeUrl } = useTelemetry();
  const [stateText, stateTone] = SERIAL_TEXT[serial.state];

  return (
    <div className="space-y-6">
      <ConnectionTitle />

      <section className="panel max-w-2xl p-6">
        <h3 className="mb-2 text-xl">Conexión USB</h3>
        <Row
          label="Navegador compatible"
          value={serial.supported === null ? "—" : serial.supported ? "Sí" : "No (usá Chrome de escritorio)"}
          tone={serial.supported === null ? "idle" : serial.supported ? "ok" : "bad"}
        />
        <Row label="Estado" value={stateText} tone={stateTone} />
        {serial.error && <p className="py-2 text-sm text-bad">{serial.error}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <ConnectButton />
          <BaudSelect />
        </div>
        <p className="mt-4 text-sm text-slate-400">
          La velocidad debe coincidir con la del CubeSat (<code className="font-mono">Serial.begin</code> en su código). Si no
          llega nada o se ve basura, probá con otra.
        </p>
      </section>

      {bridgeUrl && (
        <section className="panel max-w-2xl p-6">
          <h3 className="mb-2 text-xl">Puente local (opcional)</h3>
          <Row label="Dirección" value={bridgeUrl} tone={bridge ? "ok" : "bad"} />
          <Row label="USB del puente" value={bridge ? (bridge.serial.path ?? "Buscando…") : "—"} />
          <Row label="Wi-Fi (UDP)" value={bridge ? `Puerto ${bridge.udp.port}` : "—"} />
        </section>
      )}
    </div>
  );
}
