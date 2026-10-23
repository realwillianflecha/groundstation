"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Box, FileText, House, Settings, SatelliteDish, TrendingUp } from "lucide-react";

const NAV = [
  { href: "/", label: "Inicio", icon: House },
  { href: "/telemetria", label: "Telemetría", icon: TrendingUp },
  { href: "/registros", label: "Registros", icon: FileText },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const first = setTimeout(() => setNow(new Date()), 0);
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  if (!now) return <div className="h-5 w-44" />;
  const date = now.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" }).replace(/\./g, "");
  const time = now.toLocaleTimeString("es-AR", { hour12: false });
  return (
    <div className="flex items-center gap-3 font-mono text-sm tabular-nums text-slate-300 sm:text-base">
      <span>{date}</span>
      <span className="h-4 w-px bg-slate-500" />
      <span>{time}</span>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-edge px-4 py-4 sm:px-8">
        <div className="flex items-center gap-4">
          <Box className="size-10 text-accent sm:size-12" strokeWidth={1.4} />
          <div>
            <h1 className="text-2xl font-medium leading-none tracking-tight sm:text-3xl">Estación Terrestre</h1>
            <p className="mt-1 text-sm text-slate-300 sm:text-base">Telemetría de CubeSats</p>
          </div>
        </div>
        <Clock />
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        <nav className="flex gap-1 border-b border-edge p-3 md:w-64 md:flex-col md:justify-between md:border-b-0 md:border-r md:p-4">
          <ul className="flex flex-1 gap-1 overflow-x-auto md:flex-none md:flex-col md:gap-2">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-4 whitespace-nowrap rounded-xl px-4 py-3 text-base transition-colors ${
                      active
                        ? "border border-accent/40 bg-accent/20 text-white"
                        : "border border-transparent text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <Icon className={`size-5 ${active ? "text-accent-strong" : "text-accent"}`} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <SatelliteDish className="mx-4 mb-4 hidden size-14 text-accent/70 md:block" strokeWidth={1.2} />
        </nav>

        <main className="relative flex-1 overflow-hidden p-4 sm:p-8">
          <div className="earth-glow" aria-hidden />
          <div className="relative">{children}</div>
        </main>
      </div>
    </div>
  );
}
