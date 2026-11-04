const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const compiled = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, "../../lib/ai/schema.ts"), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;
vm.runInNewContext(compiled, { module, exports: module.exports, require, Date });
