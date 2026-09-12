import { mkdirSync, copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";
/** Keep Reactor's runtime WASM pair adjacent, outside the RSC module graph. */
export function reactorWasm(): Plugin {
  return {
    name: "cutline-reactor-wasm",
    enforce: "pre",
    configResolved(config) {
      const source = resolve(
        config.root,
        "node_modules/@reactor-team/js-sdk/dist/wasm",
      );
      const destination = resolve(config.root, "public/reactor/wasm");
      mkdirSync(destination, { recursive: true });
      for (const name of ["reactor_wasm.js", "reactor_wasm_bg.wasm"]) {
        if (!existsSync(resolve(source, name)))
          throw new Error("Reactor WASM assets are missing. Run npm ci.");
        copyFileSync(resolve(source, name), resolve(destination, name));
      }
    },
    transform(code, id) {
      if (
        !id
          .replaceAll("\\", "/")
          .endsWith("/@reactor-team/js-sdk/dist/index.js")
      )
        return null;
      // A nonliteral runtime import prevents RSC's dependency analysis from
      // turning this public URL into an unresolved server-side static import.
      return code
        .replace(
          "async function importWasmModule() {",
          'async function importWasmModule() { const cutlineWasmUrl = "/reactor/wasm/reactor_wasm.js";',
        )
        .replace('"./wasm/reactor_wasm.js"', "cutlineWasmUrl");
    },
  };
}
