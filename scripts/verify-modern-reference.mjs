// Optional independent pixel comparison; external artwork stays outside the repo.
import vm from "node:vm";
import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { readIconContainer } from "../js/amiga-icon.js";
import { decodeColorIcon, decodeNewIcons } from "../js/modern-icon-codecs.js";
const root = process.argv[2];
if (!root)
  throw new Error(
    "Usage: node scripts/verify-modern-reference.mjs /path/to/Amiga-Icon-converter",
  );
const context = vm.createContext({
  console: { log() {}, warn() {}, error() {} },
  require: createRequire(import.meta.url),
});
for (const file of ["lib/file.js", "icon.js"])
  vm.runInContext(await readFile(root + "/" + file, "utf8"), context);
let count = 0;
for (const dir of await readdir(root + "/test-icons"))
  for (const file of await readdir(root + "/test-icons/" + dir)) {
    if (!file.endsWith(".info")) continue;
    const b = await readFile(root + "/test-icons/" + dir + "/" + file),
      buffer = b.buffer.slice(b.byteOffset, b.byteOffset + b.length);
    const container = readIconContainer(buffer);
    let ours;
    if (container.extension.length)
      ours = await decodeColorIcon(container.extension);
    else if (container.toolTypes.some((v) => /^IM[12]=/.test(v)))
      ours = decodeNewIcons(container.toolTypes);
    else continue;
    context.sample = buffer;
    const upstream = vm.runInContext(
      "Icon.parse(BinaryStream(sample,true),function(){})",
      context,
    );
    const source = upstream.colorIcon || upstream.newIcon;
    for (let state = 0; state < ours.states.length; state++) {
      const actual = ours.states[state],
        expected = source.states[state];
      assert.equal(actual.width, source.width);
      assert.equal(actual.height, source.height);
      for (let i = 0; i < actual.width * actual.height; i++) {
        const rgb = expected.rgba
          ? expected.pixels[i]
          : expected.palette[expected.pixels[i]];
        for (let component = 0; component < 3; component++)
          assert.equal(
            actual.rgba[i * 4 + component],
            rgb[component],
            `${dir}/${file} state ${state} pixel ${i}`,
          );
        if (expected.rgba)
          assert.equal(actual.rgba[i * 4 + 3], Math.round(rgb[3] * 255));
      }
    }
    count++;
    console.log(
      `${dir}/${file}: independent source RGB${ours.format === "OS4 ARGB" ? "A" : ""} match`,
    );
  }
console.log(`${count} modern icons compared before palette reduction.`);
