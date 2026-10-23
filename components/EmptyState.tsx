"use client";

import { Cable, SatelliteDish, TriangleAlert, Wifi } from "lucide-react";
import { BaudSelect, ConnectButton } from "@/components/ConnectButton";
import { StatusDot } from "@/components/StatusBadge";
import { useTelemetry, type BridgeStatus } from "@/lib/telemetry";

function usbLine(serial: BridgeStatus["serial"]) {
  if (serial.state === "open") return { tone: "ok", text: `Conectado en ${serial.path}` } as const;
  if (serial.state === "error") return { tone: "bad", text: serial.error ?? "Error al abrir el puerto" } as const;
  return { tone: "warn", text: "Buscando placa por USB…" } as const;
}

function wifiLine(udp: BridgeStatus["udp"]) {
  if (udp.state === "listening") return { tone: "ok", text: `Escuchando en el puerto ${udp.port}` } as const;
  if (udp.state === "error") return { tone: "bad", text: udp.error ?? "Error de red" } as const;
  return { tone: "warn", text: "Iniciando…" } as const;
}

/** Pantalla que se muestra mientras no llegó ningún dato de un CubeSat. */
export function EmptyState() {
  const { link, serial, bridge } = useTelemetry();
  const waiting = link === "waiting";
  const unsupported = serial.supported === false;

  return (
    <section className="panel mx-auto flex max-w-3xl flex-col items-center gap-8 px-6 py-12 text-center sm:py-16">
      <div className="radar" aria-hidden>
        <SatelliteDish className="relative z-10 size-14 text-accent-strong" strokeWidth={1.3} />
      </div>

      <div className="space-y-2">
        <h3 className="text-2xl font-medium sm:text-3xl">{waiting ? "Esperando datos del CubeSat" : "Conectá un CubeSat"}</h3>
        <p className="mx-auto max-w-xl text-slate-300">
          {waiting
            ? "La conexión está abierta. Los sensores aparecerán solos apenas llegue el primer dato."
            : "Enchufá la placa por USB y elegí su puerto. Los sensores aparecen solos según lo que el CubeSat envíe."}
        </p>
      </div>

      {unsupported ? (
        <p className="flex max-w-md items-start gap-3 rounded-xl border border-warn/40 bg-warn/10 p-4 text-left text-warn">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" />
          Este navegador no permite conectarse por USB. Abrí la aplicación en Google Chrome de escritorio.
        </p>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <ConnectButton size="lg" />
          <BaudSelect />
        </div>
      )}

      {serial.error && (
        <p className="flex max-w-md items-start gap-3 rounded-xl border border-bad/40 bg-bad/10 p-4 text-left text-bad">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" />
          {serial.error}
        </p>
      )}

      {!waiting && !unsupported && (
        <ul className="max-w-md space-y-1.5 text-left text-sm text-slate-400">
          <li>· Usá un cable USB de datos (algunos solo cargan).</li>
          <li>· Cerrá el Monitor Serie del Arduino IDE.</li>
          <li>· En la ventana de Chrome elegí el puerto &quot;CP210x&quot; (o el que aparezca al enchufar la placa).</li>
        </ul>
      )}

      {bridge && (
        <ul className="w-full max-w-md space-y-3 rounded-xl border border-edge bg-space-900/50 p-5 text-left">
          <li className="flex items-center gap-3">
            <Cable className="size-5 text-accent" />
            <span className="flex-1">Puente · USB</span>
            <span className="flex items-center gap-2 text-sm text-slate-300">
              {usbLine(bridge.serial).text}
              <StatusDot tone={usbLine(bridge.serial).tone} live />
            </span>
          </li>
          <li className="flex items-center gap-3">
            <Wifi className="size-5 text-accent" />
            <span className="flex-1">Puente · Wi-Fi</span>
            <span className="flex items-center gap-2 text-sm text-slate-300">
              {wifiLine(bridge.udp).text}
              <StatusDot tone={wifiLine(bridge.udp).tone} live />
            </span>
          </li>
        </ul>
      )}
    </section>
  );
}
