import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Newsreader } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", display: "swap", style: ["normal", "italic"] });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = { title: { default: "Dialed", template: "%s · Dialed" }, description: "Das mobile Brew Journal für bessere Espresso-Shots.", applicationName: "Dialed" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#FBF8F3" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="de" className={`${inter.variable} ${newsreader.variable} ${jetbrains.variable}`}><body>{children}<Toaster position="bottom-center" offset={{ bottom: "calc(76px + env(safe-area-inset-bottom))" }} mobileOffset={{ bottom: "calc(76px + env(safe-area-inset-bottom))" }} richColors /></body></html>;
}
