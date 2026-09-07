// Optional cross-check against a separate, unmodified MIT upstream checkout.
import vm from "node:vm";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { AmigaIcon } from "../js/amiga-icon.js";
const root = process.argv[2];
if (!root)
  throw new Error(
    "Usage: node scripts/verify-reference.mjs /path/to/Amiga-Icon-Editor",
  );
const context = vm.createContext({
  console: { log() {}, warn() {}, error() {} },
});
for (const name of ["file.js", "icon.js"])
  vm.runInContext(
    await readFile(resolve(root, "_script/lib", name), "utf8"),
    context,
  );
for (const name of await readdir(new URL("../samples/", import.meta.url))) {
  if (!name.endsWith(".info")) continue;
  const data = await readFile(new URL("../samples/" + name, import.meta.url));
  context.sample = data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength,
  );
  const upstream = vm.runInContext(
      "Icon.parse(BinaryStream(sample,true))",
      context,
    ),
    ours = AmigaIcon.parse(context.sample);
  for (const key of [
    "type",
    "userData",
    "stackSize",
    "currentX",
    "currentY",
    "width",
    "height",
  ])
    assert.equal(upstream[key], ours[key]);
  for (const [a, b] of [
    [upstream.img, ours.normal],
    [upstream.img2, ours.selected],
  ]) {
    for (let y = 0; y < b.height; y++)
      for (let x = 0; x < b.width; x++)
        assert.equal(a.pixels[y][x], b.pixels[y * b.width + x]);
  }
  console.log(
    `${name}: independent upstream parser matches every pixel and key metadata`,
  );
}
// Upstream's writer has a non-16-width padding bug. Use aligned width for this fixture.
const foreign = vm.runInContext(
  `
  var source = Icon.create(16,16);
  delete source.colorIcon;
  source.width=16; source.height=16; source.userData=0; source.type=3; source.stackSize=16384;
  source.img={leftEdge:0,topEdge:0,width:16,height:16,depth:2,hasimageData:1,planePick:3,planeOnOff:0,nextImage:0,pixels:Array.from({length:256},(_,i)=>i%4)};
  source.img2=Object.assign({},source.img,{pixels:source.img.pixels.map(p=>3-p)});
  Icon.write(source);
`,
  context,
);
// Copy across VM realms to the local ArrayBuffer constructor.
const local = Uint8Array.from(new Uint8Array(foreign)).buffer;
const imported = AmigaIcon.parse(local);
for (let i = 0; i < 256; i++) {
  assert.equal(imported.normal.pixels[i], i % 4);
  assert.equal(imported.selected.pixels[i], 3 - (i % 4));
}
console.log(
  "Independent upstream writer → local parser: normal and selected pixels match",
);
