import { test, equal, bytesEqual, throws } from "./harness.js";
import { quantizeRGBA, WB13_PALETTE } from "../js/palette.js";
import { History } from "../js/history.js";
import {
  generateSelected,
  resizeIcon,
  transform,
} from "../js/editor-operations.js";
import { AmigaIcon } from "../js/amiga-icon.js";
import { iconFilename } from "../js/image-import.js";
test("PNG Alpha-Grenze und Palette", () => {
  bytesEqual(
    quantizeRGBA(
      [
        255, 255, 255, 127, 255, 255, 255, 128, 255, 136, 0, 255, 0, 0, 0, 255,
        85, 170, 255, 255,
      ],
      WB13_PALETTE,
    ),
    [0, 1, 3, 2, 0],
  );
});
test("Download-Dateinamen", () => {
  equal(iconFilename(" Wetter.info.info "), "Wetter.info");
  equal(iconFilename("Wetter"), "Wetter.info");
  for (const name of [
    "",
    ".info",
    "../Test",
    "Wetter/Heute",
    "😀",
    "a".repeat(26),
  ])
    throws(() => iconFilename(name));
});
test("History: 60 Schritte, Kopien und Redo-Verzweigung", () => {
  const h = new History(60),
    state = { pixels: new Uint8Array([0]) };
  h.reset(state);
  for (let i = 1; i <= 70; i++) {
    state.pixels[0] = i;
    h.push(state);
  }
  equal(h.entries.length, 61);
  let result;
  for (let i = 0; i < 60; i++) result = h.undo();
  equal(result.pixels[0], 10);
  equal(h.canUndo, false);
  result.pixels[0] = 99;
  equal(h.redo().pixels[0], 11);
  h.push({ pixels: new Uint8Array([42]) });
  equal(h.canRedo, false);
  equal(h.undo().pixels[0], 11);
});
test("Selected-Varianten und getrennte Arrays", () => {
  const pixels = new Uint8Array([0, 1, 2, 3]);
  bytesEqual(generateSelected(pixels, 2, "swap12"), [0, 2, 1, 3]);
  bytesEqual(generateSelected(pixels, 2, "swap13"), [0, 3, 2, 1]);
  bytesEqual(generateSelected(pixels, 2, "invert"), [3, 2, 1, 0]);
  const copy = generateSelected(pixels, 2, "copy");
  copy[0] = 3;
  equal(pixels[0], 0);
  throws(() => generateSelected(new Uint8Array(1), 1, "swap13"));
});
test("Resize, Depth-Reduktion und Bildversatz", () => {
  const icon = AmigaIcon.create({
    width: 3,
    height: 2,
    normalPixels: new Uint8Array([1, 2, 3, 3, 2, 1]),
  });
  throws(() => resizeIcon(icon, 3, 2, 1), /Pen/);
  equal(icon.depth, 2);
  resizeIcon(icon, 2, 3, 2);
  bytesEqual(icon.normal.pixels, [1, 2, 3, 2, 0, 0]);
  icon.normal.leftEdge = 1;
  resizeIcon(icon, 3, 3, 2);
  bytesEqual(icon.normal.pixels, [0, 1, 2, 0, 3, 2, 0, 0, 0]);
});
test("Spiegeln und Schieben ohne Wrap", () => {
  const img = {
    width: 3,
    height: 2,
    pixels: new Uint8Array([0, 1, 2, 3, 4, 5]),
  };
  bytesEqual(transform(img, "mirrorH"), [2, 1, 0, 5, 4, 3]);
  bytesEqual(transform(img, "mirrorV"), [3, 4, 5, 0, 1, 2]);
  bytesEqual(transform(img, "left"), [1, 2, 0, 4, 5, 0]);
  bytesEqual(transform(img, "right"), [0, 0, 1, 0, 3, 4]);
  bytesEqual(transform(img, "up"), [3, 4, 5, 0, 0, 0]);
  bytesEqual(transform(img, "down"), [0, 0, 0, 0, 1, 2]);
});
