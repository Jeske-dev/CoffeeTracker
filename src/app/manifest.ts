import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest { return { name: "Dialed – Espresso Tracker", short_name: "Dialed", description: "Espresso messen, verstehen und verbessern.", start_url: "/", display: "standalone", background_color: "#FBF8F3", theme_color: "#2B1B16" }; }
