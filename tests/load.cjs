const { readFileSync } = require("node:fs");
const { dirname, resolve } = require("node:path");
const { runInThisContext } = require("node:vm");
const ts = require("typescript");

const root = resolve(__dirname, "..");
const cache = new Map();

// Compile TypeScript modules in memory, following "@/..." and relative
// imports into other project files. Node built-ins and npm packages go to
// the real require. Runs in this realm so assertions and instanceof work.
function load(relativePath) {
  const filename = relativePath.startsWith("/") ? relativePath : resolve(root, relativePath);
  if (cache.has(filename)) return cache.get(filename);
  const code = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  cache.set(filename, module.exports);
  const localRequire = (specifier) => {
    if (specifier.startsWith("@/")) return load(resolve(root, specifier.slice(2) + ".ts"));
    if (specifier.startsWith(".")) return load(resolve(dirname(filename), specifier + ".ts"));
    return require(specifier);
  };
  const wrapper = runInThisContext(`(function (exports, require, module, __filename, __dirname) {${code}\n})`, { filename });
  wrapper(module.exports, localRequire, module, filename, dirname(filename));
  cache.set(filename, module.exports);
  return module.exports;
}

module.exports = { load };
