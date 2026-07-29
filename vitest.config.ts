import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vitest/config";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(rootDir)
    }
  },
  test: {
    environment: "node",
    env: {
      DATABASE_URL: "file:./test.db",
      NODE_ENV: "test"
    },
    globalSetup: ["./tests/global-setup.ts"],
    fileParallelism: false,
    isolate: false,
    include: ["tests/**/*.test.ts"]
  }
});
