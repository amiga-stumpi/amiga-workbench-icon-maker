import "./editor.test.js";
import "./bitplanes.test.js";
import "./amiga-icon.test.js";
import { runAll } from "./harness.js";
const results = await runAll();
for (const result of results.filter((r) => !r.ok))
  console.error(`FAIL ${result.name}: ${result.error}`);
console.log(
  `${results.filter((r) => r.ok).length}/${results.length} Tests erfolgreich.`,
);
if (results.some((r) => !r.ok)) process.exitCode = 1;
