import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    target: "es2022",
    // 单文件产物不需要 modulepreload 的 polyfill，它会引入 fetch 调用。
    modulePreload: { polyfill: false },
  },
});
