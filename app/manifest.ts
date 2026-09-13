import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Storybooks",
    short_name: "Storybooks",
    description:
      "Say what you want to see. Storybooks paints the scene, keeps it as a page, and reads the whole book back to you.",
    start_url: "/play",
    scope: "/",
    display: "standalone",
    orientation: "landscape",
    background_color: "#FBF5EA",
    theme_color: "#FBF5EA",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
