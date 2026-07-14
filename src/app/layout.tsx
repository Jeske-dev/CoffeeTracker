import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Newsreader } from "next/font/google";
import { ServiceWorkerRegistrar } from "@/components/pwa/service-worker-registrar";
import { Toaster } from "@/components/ui/sonner";
import { PwaInstallationProvider } from "@/hooks/use-pwa-installation";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", display: "swap", style: ["normal", "italic"] });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Dialed", template: "%s · Dialed" },
  description: "Das mobile Brew Journal für bessere Espresso-Shots.",
  applicationName: "Dialed",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Dialed", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/dialed-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", interactiveWidget: "resizes-content", themeColor: "#2B1B16" };
export const preferredRegion = "fra1";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="de" className={`${inter.variable} ${newsreader.variable} ${jetbrains.variable}`}><body><PwaInstallationProvider>{children}<ServiceWorkerRegistrar /><Toaster position="bottom-center" offset={{ bottom: "calc(76px + env(safe-area-inset-bottom))" }} mobileOffset={{ bottom: "calc(76px + env(safe-area-inset-bottom))" }} richColors /></PwaInstallationProvider><SpeedInsights /></body></html>;
}
