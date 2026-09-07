import "./modern-icon.test.js";
import "./editor.test.js";
import "./bitplanes.test.js";
import "./amiga-icon.test.js";
import { runAll } from "./harness.js";
const results = await runAll();
document.querySelector("#summary").textContent =
  `${results.filter((r) => r.ok).length}/${results.length} Tests erfolgreich`;
for (const result of results) {
  const row = document.createElement("li");
  row.textContent = `${result.ok ? "PASS" : "FAIL"} · ${result.name}${result.error ? ": " + result.error : ""}`;
  document.querySelector("#results").append(row);
}
document.body.dataset.failed = String(results.filter((r) => !r.ok).length);
