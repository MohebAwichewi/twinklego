import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TwinkleGo - Trusted Help Nearby",
    short_name: "TwinkleGo",
    description: "Request trusted local help or earn by completing nearby tasks.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#fffefd",
    theme_color: "#2789d8",
    orientation: "portrait-primary",
    categories: ["lifestyle", "business", "productivity"],
    icons: [
      { src: "/icons/twinklego-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/twinklego-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/twinklego-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
