"use client";

import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatTime, formatValue, type Reading, type SensorMeta } from "@/lib/sensors";

type Props = {
  readings: Reading[];
  sensor: SensorMeta;
  height?: number;
  /** Cantidad de lecturas más recientes a mostrar */
  window?: number;
};

// Rango del eje Y que se adapta a los datos, con margen para que una línea casi plana no se pegue al borde.
function autoDomain([min, max]: readonly [number, number]): [number, number] {
  const pad = Math.max((max - min) * 0.2, Math.abs(max) * 0.005, 0.5);
  return [Math.floor((min - pad) * 10) / 10, Math.ceil((max + pad) * 10) / 10];
}

export function LiveChart({ readings, sensor, height = 260, window = 120 }: Props) {
  const gradientId = useId();
  const data = readings.slice(-window);

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={sensor.color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={sensor.color} stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#6b8bc4" strokeOpacity={0.18} vertical={false} />
          <XAxis
            dataKey="ts"
            tickFormatter={formatTime}
            stroke="#8aa3cf"
            tick={{ fill: "#b4c4e0", fontSize: 12 }}
            tickLine={false}
            minTickGap={48}
          />
          <YAxis
            domain={autoDomain}
            tickFormatter={(v) => String(Number(Number(v).toFixed(1)))}
            stroke="#8aa3cf"
            tick={{ fill: "#b4c4e0", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip
            contentStyle={{ background: "#0b1730", border: "1px solid #3b5a95", borderRadius: 10, color: "#e6edf8" }}
            labelFormatter={(ts) => formatTime(Number(ts))}
            formatter={(v) => [`${formatValue(sensor, Number(v))} ${sensor.unit}`.trim(), sensor.label]}
          />
          <Area
            type="monotone"
            dataKey={(r: Reading) => r.values[sensor.key]}
            stroke={sensor.color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            connectNulls
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
