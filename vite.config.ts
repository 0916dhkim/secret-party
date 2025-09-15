import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import flowCss from "@flow-css/vite";
import theme from "./app/theme";

export default defineConfig({
  plugins: [
    flowCss({ theme }),
    tsConfigPaths(),
    tanstackStart({
      tsr: {
        srcDirectory: "./app",
      },
      customViteReactPlugin: true,
    }),
    viteReact(),
  ],
});
