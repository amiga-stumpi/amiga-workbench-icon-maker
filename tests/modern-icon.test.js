import { test, equal, bytesEqual, throws, assert } from "./harness.js";
import { importIcon } from "../js/icon-import.js";
import {
  decodeColorIcon,
  decodeNewIcons,
  unpackIconRLE,
} from "../js/modern-icon-codecs.js";
import { AmigaIcon, readIconContainer } from "../js/amiga-icon.js";
import { splitPNGIcon } from "../js/png-icon.js";
import {
  colorFixture,
  argbFixture,
  envelope,
  newIconTypes,
  bitBytes,
  pngFixture,
  concat,
  form,
  chunk,
} from "./modern-fixtures.js";
async function rejects(run, pattern) {
  let error;
  try {
    await run();
  } catch (e) {
    error = e;
  }
  assert(error, "Fehler erwartet");
  if (pattern) assert(pattern.test(error.message), error.message);
}
for (const compressed of [false, true])
  test(`ColorIcon ${compressed ? "RLE" : "unkomprimiert"} mit Selected-Palettenübernahme`, async () => {
    const bytes = colorFixture(compressed),
      icon = await importIcon(bytes);
    equal(icon.sourceFormat, "ColorIcon / GlowIcon");
    equal(icon.width, 4);
    equal(icon.height, 1);
    bytesEqual(icon.normal.pixels, [0, 1, 2, 3]);
    bytesEqual(icon.selected.pixels, [3, 2, 1, 0]);
    const exported = AmigaIcon.parse(AmigaIcon.write(icon));
    equal(exported.userData, 0);
    bytesEqual(exported.normal.pixels, icon.normal.pixels);
    throws(() => AmigaIcon.parse(bytes));
  });
test("NewIcons: mehrzeilige Palette und getrennte Zustände", async () => {
  const toolTypes = newIconTypes(),
    decoded = decodeNewIcons(toolTypes);
  equal(decoded.states[0].rgba[3], 0);
  equal(decoded.states[1].rgba[15], 255);
  const icon = await importIcon(envelope(new Uint8Array(), { toolTypes }));
  bytesEqual(icon.normal.pixels, [0, 1, 2, 3]);
  bytesEqual(icon.selected.pixels, [3, 2, 1, 0]);
  equal(icon.toolTypes.join(""), "PORT=1234");
  equal(icon.sourceFormat, "NewIcon");
  AmigaIcon.parse(AmigaIcon.write(icon));
});
test("NewIcon-Zero-RLE und unvollständige Daten", () => {
  const header = String.fromCharCode(66, 37, 34, 33, 34);
  const decoded = decodeNewIcons([
    "IM1=" + header + String.fromCharCode(212),
    "IM1=" + String.fromCharCode(209),
  ]);
  assert(decoded.states[0].rgba.every((v) => v === 0));
  throws(() => decodeNewIcons(["IM1=B"]), /Kopf/);
  throws(() => decodeNewIcons(newIconTypes().slice(0, 4)), /Unvollständige/);
});
for (const minusOne of [false, true])
  test(`OS4 ARGB zlib, Längenfeld ${minusOne ? "size-1" : "size"}`, async () => {
    const icon = await importIcon(await argbFixture(minusOne));
    equal(icon.sourceFormat, "OS4 ARGB");
    bytesEqual(icon.normal.pixels, [0, 1, 2, 3]);
    equal(icon.selected, null);
    equal(icon.type, 2);
    equal(icon.drawerData.length, 56);
    equal(icon.userData, 0);
    AmigaIcon.parse(AmigaIcon.write(icon));
  });
test("ARGB begrenzt entpackte Daten auf die Bildgröße", async () => {
  await rejects(
    async () => importIcon(await argbFixture(false, true)),
    /überschreiten/,
  );
});
test("Planare OS2-Revision mit DrawerData2", async () => {
  const icon = await importIcon(envelope(new Uint8Array(), { drawer: true }));
  equal(icon.sourceFormat, "OS2+/OS3 / MagicWB");
  equal(icon.drawerData.length, 56);
  equal(icon.userData, 0);
  assert(icon.importNotice.includes("OS2+"));
  AmigaIcon.parse(AmigaIcon.write(icon));
});
test("Klassischer Import bleibt unverändert", async () => {
  const bytes = AmigaIcon.write(AmigaIcon.create());
  const icon = await importIcon(bytes);
  bytesEqual(new Uint8Array(AmigaIcon.write(icon)), new Uint8Array(bytes));
});
test("RLE: Wiederholung, NOP, bitübergreifende Pakete und Grenzen", () => {
  bytesEqual(
    unpackIconRLE(
      bitBytes(["10000000", "11111110", "11", "00000000", "01"]),
      2,
      4,
    ),
    [3, 3, 3, 1],
  );
  throws(
    () => unpackIconRLE(new Uint8Array([255, 255]), 2, 1),
    /überschreitet/,
  );
  throws(() => unpackIconRLE(new Uint8Array([128]), 2, 1));
});
test("ColorIcon: fehlendes FACE, ungültiger FORM und abgeschnittene Chunks", async () => {
  await rejects(
    () => decodeColorIcon(form(chunk("IMAG", new Uint8Array(10)))),
    /FACE/,
  );
  const extension = readIconContainer(colorFixture()).extension;
  for (let size = 0; size < extension.length; size++)
    await rejects(() => decodeColorIcon(extension.slice(0, size)));
});
test("PNG/DualPNG Chunk-Grenzen, CRC und Abschneiden", async () => {
  const png = await pngFixture(),
    dual = concat(png, png);
  equal(splitPNGIcon(png.buffer).images.length, 1);
  equal(splitPNGIcon(dual.buffer).images.length, 2);
  const bad = png.slice();
  bad[29] ^= 1;
  throws(() => splitPNGIcon(bad.buffer), /CRC/);
  throws(() => splitPNGIcon(concat(png, new Uint8Array([1])).buffer));
  for (let i = 0; i < png.length; i++)
    throws(() => splitPNGIcon(png.slice(0, i).buffer));
});
test("Moderne Import-Optionen validieren", async () => {
  await rejects(() => importIcon(colorFixture(), { alpha: -1 }), /Alpha/);
  await rejects(() => importIcon(colorFixture(), { depth: 4 }), /Farbtiefe/);
  const icon = await importIcon(colorFixture(), { depth: 1 });
  assert(icon.normal.pixels.every((p) => p < 2));
});
