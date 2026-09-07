// Synthetic test assets created for this project; no third-party icon artwork.
import { AmigaIcon } from "../js/amiga-icon.js";
import { WB13_PALETTE } from "../js/palette.js";
import { pngCRC } from "../js/png-icon.js";
export function concat(...arrays) {
  const result = new Uint8Array(arrays.reduce((sum, a) => sum + a.length, 0));
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}
function text(value) {
  return Uint8Array.from(value, (c) => c.charCodeAt(0));
}
export function u32(value) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value);
  return bytes;
}
export function chunk(kind, data) {
  return concat(
    text(kind),
    u32(data.length),
    data,
    new Uint8Array(data.length % 2),
  );
}
export function form(...chunks) {
  const body = concat(text("ICON"), ...chunks);
  return concat(text("FORM"), u32(body.length), body);
}
export function envelope(
  extension = new Uint8Array(),
  { revision = 1, toolTypes = [], drawer = false } = {},
) {
  // Add image ToolTypes after serialization to keep the classic writer strict.
  const safe = toolTypes.map((v) => v.replace(/^IM([12])=/, "XM$1="));
  const icon = AmigaIcon.create({
    width: 4,
    height: 1,
    toolTypes: safe,
    type: drawer ? 2 : 3,
    drawerData: drawer ? new Uint8Array(56) : null,
  });
  const bytes = new Uint8Array(AmigaIcon.write(icon));
  new DataView(bytes.buffer).setUint32(44, revision);
  if (toolTypes.length) {
    for (let i = 0; i < bytes.length - 4; i++)
      if (
        bytes[i] === 88 &&
        bytes[i + 1] === 77 &&
        [49, 50].includes(bytes[i + 2]) &&
        bytes[i + 3] === 61
      )
        bytes[i] = 73;
  }
  return concat(
    bytes,
    drawer && revision ? new Uint8Array(6) : new Uint8Array(),
    extension,
  ).buffer;
}
export function bitBytes(values) {
  const bits = values.join("");
  return Uint8Array.from({ length: Math.ceil(bits.length / 8) }, (_, i) =>
    parseInt(bits.slice(i * 8, i * 8 + 8).padEnd(8, "0"), 2),
  );
}
export function literalRLE(values, depth) {
  return bitBytes([
    (values.length - 1).toString(2).padStart(8, "0"),
    ...values.map((v) => v.toString(2).padStart(depth, "0")),
  ]);
}
const palette = WB13_PALETTE.flat();
function imag(pixels, { compressed = false, ownPalette = true } = {}) {
  const img = compressed ? literalRLE(pixels, 2) : Uint8Array.from(pixels);
  const pal = compressed ? literalRLE(palette, 8) : Uint8Array.from(palette);
  const header = new Uint8Array([
    0,
    3,
    ownPalette ? 3 : 1,
    compressed ? 1 : 0,
    compressed ? 1 : 0,
    2,
    0,
    0,
    0,
    0,
  ]);
  const view = new DataView(header.buffer);
  view.setUint16(6, img.length - 1);
  view.setUint16(8, ownPalette ? pal.length - 1 : 0);
  return chunk(
    "IMAG",
    concat(header, img, ownPalette ? pal : new Uint8Array()),
  );
}
export function colorFixture(compressed = false) {
  return envelope(
    form(
      chunk("FACE", new Uint8Array([3, 0, 0, 17, 0, 11])),
      imag([0, 1, 2, 3], { compressed }),
      imag([3, 2, 1, 0], { compressed, ownPalette: false }),
    ),
  );
}
export async function deflate(bytes) {
  return new Uint8Array(
    await new Response(
      new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate")),
    ).arrayBuffer(),
  );
}
export async function argbFixture(minusOne = false, oversize = false) {
  const bytes = Uint8Array.from([
    0,
    85,
    170,
    255,
    255,
    255,
    255,
    255,
    255,
    0,
    0,
    0,
    255,
    255,
    136,
    0,
    ...(oversize ? [0, 0, 0, 0] : []),
  ]);
  const zipped = await deflate(bytes),
    data = concat(
      u32(1),
      u32(zipped.length - (minusOne ? 1 : 0)),
      new Uint8Array(2),
      zipped,
    );
  return envelope(
    form(
      chunk("FACE", new Uint8Array([3, 0, 0, 17, 0, 0])),
      chunk("ARGB", data),
    ),
    { drawer: true },
  );
}
function seven(values, depth) {
  const bits = values.map((v) => v.toString(2).padStart(depth, "0")).join("");
  let result = "";
  for (let i = 0; i < bits.length; i += 7) {
    const v = parseInt(bits.slice(i, i + 7).padEnd(7, "0"), 2);
    result += String.fromCharCode(v + (v < 95 ? 32 : 81));
  }
  return result;
}
export function newIconTypes() {
  const types = ["PORT=1234", "*** DON'T EDIT THE FOLLOWING LINES!! ***"];
  for (const state of [1, 2]) {
    const prefix = `IM${state}=`,
      header = String.fromCharCode(state === 1 ? 66 : 67, 37, 34, 33, 37);
    types.push(
      prefix + header + seven(palette.slice(0, 6), 8),
      prefix + seven(palette.slice(6), 8),
      prefix + seven(state === 1 ? [0, 1, 2, 3] : [3, 2, 1, 0], 2),
    );
  }
  return types;
}
function pngChunk(kind, data) {
  const body = concat(text(kind), data);
  return concat(u32(data.length), body, u32(pngCRC(body)));
}
export async function pngFixture(color = [255, 136, 0, 255]) {
  const header = concat(u32(1), u32(1), new Uint8Array([8, 6, 0, 0, 0]));
  return concat(
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", await deflate(new Uint8Array([0, ...color]))),
    pngChunk("IEND", new Uint8Array()),
  );
}
