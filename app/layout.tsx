import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Shell } from "@/components/Shell";
import { TelemetryProvider } from "@/lib/telemetry";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Estación Terrestre · CubeSat",
  description: "Telemetría en tiempo real de CubeSats",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full font-sans antialiased`}
    >
      <body className="min-h-full">
        <TelemetryProvider>
          <Shell>{children}</Shell>
        </TelemetryProvider>
      </body>
    </html>
  );
}
