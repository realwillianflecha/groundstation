import { formatValue, type SensorMeta } from "@/lib/sensors";

export function SensorCard({ sensor, value, stale = false }: { sensor: SensorMeta; value: number | undefined; stale?: boolean }) {
  const Icon = sensor.icon;
  return (
    <div className={`panel flex flex-col items-center gap-2 px-3 py-5 text-center transition-opacity ${stale ? "opacity-50" : ""}`}>
      <Icon className="size-9" style={{ color: sensor.color }} strokeWidth={1.5} />
      <span className="text-sm text-slate-300">{sensor.label}</span>
      <span className="font-mono text-2xl font-medium tabular-nums sm:text-3xl">
        {value === undefined ? "—" : formatValue(sensor, value)}
        {sensor.unit && <span className="ml-1.5 text-lg text-slate-200">{sensor.unit}</span>}
      </span>
    </div>
  );
}
