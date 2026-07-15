import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { ServiceWorkerRegistrar } from "@/components/pwa/service-worker-registrar";
import { Toaster } from "@/components/ui/sonner";
import { PwaInstallationProvider } from "@/hooks/use-pwa-installation";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });

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
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", interactiveWidget: "resizes-content", themeColor: "#F9F9F9" };
export const preferredRegion = "fra1";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="de" className={`${inter.variable} ${playfair.variable}`}><body><PwaInstallationProvider>{children}<ServiceWorkerRegistrar /><Toaster position="bottom-center" offset={{ bottom: "calc(76px + env(safe-area-inset-bottom))" }} mobileOffset={{ bottom: "calc(76px + env(safe-area-inset-bottom))" }} /></PwaInstallationProvider><SpeedInsights /></body></html>;
}
