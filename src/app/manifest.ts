import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OnPace",
    short_name: "OnPace",
    description:
      "OnPace is an AI-powered study planning application for students.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f9fc",
    theme_color: "#4f46e5",
    icons: [
      {
        src: "/logo.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
