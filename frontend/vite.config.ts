import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    TanStackRouterVite({
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  worker: {
    format: "es" as const,
  },
  optimizeDeps: {
    exclude: ["tfhe", "node-tfhe"],
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "credentialless",
    },
  },
  build: {
    target: "esnext",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) return "react";
          if (id.includes("node_modules/wagmi") || id.includes("node_modules/viem")) return "wagmi";
          if (id.includes("node_modules/@rainbow-me")) return "rainbowkit";
          if (id.includes("node_modules/@cofhe") || id.includes("node_modules/tfhe")) return "fhe";
          if (id.includes("node_modules/@radix-ui")) return "radix";
          if (id.includes("node_modules/framer-motion")) return "framer";
        },
      },
    },
  },
});

