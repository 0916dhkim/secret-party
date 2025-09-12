import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import flowCss from "@flow-css/vite";
import theme from "./app/theme";

export default defineConfig({
  plugins: [reactRouter(), flowCss({ theme })],
  optimizeDeps: {
    needsInterop: ["drizzle-kit"],
  },
});
