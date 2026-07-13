import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dialed – Espresso Tracker",
    short_name: "Dialed",
    description: "Tracke Espresso-Shots, Bohnen, Rezepte und Dial-in-Fortschritte.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FBF8F3",
    theme_color: "#2B1B16",
    lang: "de-DE",
    categories: ["food", "lifestyle", "utilities"],
    icons: [
      { src: "/icons/dialed-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/dialed-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/dialed-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
