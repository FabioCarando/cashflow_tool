import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Subscriptions",
    short_name: "Subscriptions",
    description: "A simple monthly subscription tracker.",
    start_url: "/",
    display: "standalone",
    background_color: "#090A0B",
    theme_color: "#090A0B",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}