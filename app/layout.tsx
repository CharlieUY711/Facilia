import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FACILIA — Facility Services by ODDY",
  description:
    "No vendemos productos. No vendemos horas. Entregamos continuidad operativa. Limpieza, mantenimiento y gestión de recursos críticos para empresas, oficinas y comercios.",
  icons: { icon: "/FACILIA.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}
