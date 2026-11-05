const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Exercise the real entitlement rule in route tests instead of duplicating it.
const schemaModule = { exports: {} };
const source = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, "../lib/ai/schema.ts"), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;
vm.runInNewContext(source, {
  module: schemaModule, exports: schemaModule.exports, require, Date,
});
module.exports = schemaModule.exports;
