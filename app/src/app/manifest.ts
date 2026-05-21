import type { MetadataRoute } from "next";

// Manifest do PWA — Next 16 serve em /manifest.webmanifest
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FinSmart — Controle Financeiro",
    short_name: "FinSmart",
    description: "Gerencie suas finanças pessoais com inteligência.",
    start_url: "/main/dashboard",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#10b981",
    orientation: "portrait",
    lang: "pt-BR",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    categories: ["finance", "productivity"],
  };
}
