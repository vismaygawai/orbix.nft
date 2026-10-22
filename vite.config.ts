/**
 * @file vite.config.ts
 * @description Vite configuration for Orbix NFT Marketplace with TanStack Start,
 * Tailwind CSS v4, and Nitro deployment adapter.
 *
 * Automatically switches Nitro preset between 'vercel' (when deploying on Vercel)
 * and 'node-server' (for local preview and custom Node hosting).
 */

import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const nitroPreset = process.env["VERCEL"] ? "vercel" : process.env["NITRO_PRESET"] || "node-server";

export default defineConfig({
  nitro: {
    preset: nitroPreset,
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});
