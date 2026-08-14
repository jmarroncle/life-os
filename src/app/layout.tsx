import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Life OS",
  description: "Plataforma personal de productividad: tareas, notas, finanzas y foco.",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-50 font-sans text-neutral-900">
        {/* Aplica el tema guardado antes del primer paint, para no flashear
            el tema claro y después saltar a oscuro. Script bloqueante a
            propósito (sin async/defer) — corre durante el parseo del HTML,
            antes de que el navegador pinte el resto del body. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("life-os:theme")==="dark"){document.documentElement.dataset.theme="dark"}}catch(e){}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
