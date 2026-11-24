/**
 * @file vite.config.ts
 * @description Vite configuration for ORBIX.NFT Marketplace with TanStack Start,
 * Tailwind CSS v4, and Nitro deployment adapter.
 *
 * Automatically switches Nitro preset between 'vercel' (when deploying on Vercel)
 * and 'node-server' (for local preview and custom Node hosting).
 */

import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

const nitroPreset = process.env["VERCEL"] ? "vercel" : process.env["NITRO_PRESET"] || "node-server";

export default defineConfig(({ command }) => ({
  plugins: [
    tailwindcss(),
    viteTsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
    }),
    ...(command === "build"
      ? [
          nitro({
            preset: nitroPreset,
          }),
        ]
      : []),
    viteReact(),
  ],
  css: {
    transformer: "lightningcss",
  },
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
}));
