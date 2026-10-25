// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const certificatePath = process.env.NOVA_HTTPS_CERT ?? join(projectRoot, "certs", "lan.pem");
const keyPath = process.env.NOVA_HTTPS_KEY ?? join(projectRoot, "certs", "lan-key.pem");
const https =
  existsSync(certificatePath) && existsSync(keyPath)
    ? { cert: readFileSync(certificatePath), key: readFileSync(keyPath) }
    : undefined;

export default defineConfig({
  vite: {
    server: {
      host: "0.0.0.0",
      https,
      proxy: {
        "/api": {
          target: "http://127.0.0.1:3001",
          changeOrigin: true,
        },
      },
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
