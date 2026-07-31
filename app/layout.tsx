import type { Metadata, Viewport } from "next";
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
    "Nos ocupamos que tu espacio nunca se detenga. Entregamos continuidad operativa. Limpieza, mantenimiento y gestión de recursos críticos para empresas, oficinas y comercios.",
  icons: { icon: "/FACILIA.png", apple: "/apple-touch-icon.png" },
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FACILIA",
  },
};

// Sin este export, iOS/Android renderizan la web a ancho de escritorio
// y el usuario tiene que hacer pinch-zoom para leer todo. viewport-fit=cover
// habilita además los safe-area-inset-* para notch / home indicator del iPhone.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B2A61",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}
