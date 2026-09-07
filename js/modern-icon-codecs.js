// Format decoding adapted from Steffest's Amiga-Icon-converter/icon.js.
// Copyright (c) 2019-2023 Steffest - dev@stef.be. MIT: ../THIRD_PARTY_LICENSES.md.
import { BinaryStream } from "./binary-stream.js";
import { validateDimensions } from "./amiga-bitplanes.js";

function streamFor(bytes) {
  return new BinaryStream(bytes.slice().buffer);
}
export function indexedRGBA(width, height, pixels, palette, transparent = -1) {
  validateDimensions(width, height, 1);
  if (pixels.length !== width * height)
    throw new Error("Unvollständiges Icon-Bild.");
  const rgba = new Uint8ClampedArray(pixels.length * 4);
  pixels.forEach((pen, i) => {
    if (!palette[pen])
      throw new Error(`Icon-Palette enthält Farbindex ${pen} nicht.`);
    rgba.set([...palette[pen], pen === transparent ? 0 : 255], i * 4);
  });
  return { width, height, rgba };
}

// PackBits packets are bit-aligned, not byte-aligned; control = 8 bits,
// sample = depth bits. Decode by expected output count, never by padding bits.
export function unpackIconRLE(bytes, depth, count) {
  if (depth < 1 || depth > 8)
    throw new Error("Ungültige komprimierte Farbtiefe.");
  const stream = streamFor(bytes),
    result = new Uint8Array(count);
  let bit = 0,
    out = 0;
  const read = (n) => {
    const value = stream.readBits(n, bit, 0);
    bit += n;
    return value;
  };
  while (out < count) {
    const control = read(8);
    if (control === 128) continue;
    const length = control < 128 ? control + 1 : 257 - control;
    if (out + length > count)
      throw new Error("RLE-Paket überschreitet die Icon-Bildgröße.");
    if (control < 128)
      for (let i = 0; i < length; i++) result[out++] = read(depth);
    else {
      const value = read(depth);
      result.fill(value, out, out + length);
      out += length;
    }
  }
  return result;
}

async function inflateARGB(bytes, expectedSize) {
  if (typeof DecompressionStream === "undefined")
    throw new Error("Dieser Browser unterstützt die OS4-Dekompression nicht.");
  const reader = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("deflate"))
    .getReader();
  const output = new Uint8Array(expectedSize);
  let offset = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (offset + value.length > expectedSize)
        throw new Error("ARGB-Daten überschreiten die Icon-Bildgröße.");
      output.set(value, offset);
      offset += value.length;
    }
    if (offset !== expectedSize)
      throw new Error("Unvollständige ARGB-Bilddaten.");
    return output;
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw new Error(
      `OS4-ARGB konnte nicht dekomprimiert werden: ${error.message}`,
    );
  } finally {
    reader.releaseLock();
  }
}

export async function decodeColorIcon(bytes) {
  const stream = streamFor(bytes);
  if (stream.readString(4) !== "FORM")
    throw new Error("Unbekannte Icon-Zusatzdaten.");
  const size = stream.readDWord();
  if (size < 4 || size + 8 !== stream.length || stream.readString(4) !== "ICON")
    throw new Error("Ungültiger FORM-ICON-Container.");
  let width, height, previousPalette;
  const indexed = [],
    argb = [];
  while (stream.index < stream.length) {
    const kind = stream.readString(4),
      length = stream.readDWord();
    const chunk = streamFor(stream.readBytes(length));
    if (length & 1) stream.jump(1);
    if (kind === "FACE") {
      if (width || length < 6) throw new Error("Ungültiger FACE-Chunk.");
      width = chunk.readUbyte() + 1;
      height = chunk.readUbyte() + 1;
    } else if (kind === "IMAG" || kind === "ARGB") {
      if (!width) throw new Error("FACE-Chunk fehlt vor den Bilddaten.");
      if (kind === "ARGB") {
        if (argb.length >= 2) throw new Error("Mehr als zwei ARGB-Zustände.");
        if (chunk.readDWord() !== 1)
          throw new Error("Unbekannte ARGB-Kompression.");
        const compressedSize = chunk.readDWord();
        chunk.readWord();
        if (!compressedSize) throw new Error("Leere ARGB-Daten.");
        // Some OS4 writers store size-1, while others store the actual size.
        // Accept exactly these two variants inside the declared chunk boundary.
        const remaining = chunk.length - chunk.index;
        if (remaining !== compressedSize && remaining !== compressedSize + 1)
          throw new Error("Ungültige ARGB-Datenlänge.");
        const source = await inflateARGB(
          chunk.readBytes(remaining),
          width * height * 4,
        );
        const rgba = new Uint8ClampedArray(source.length);
        for (let i = 0; i < source.length; i += 4)
          rgba.set([source[i + 1], source[i + 2], source[i + 3], source[i]], i);
        argb.push({ width, height, rgba });
      } else {
        if (indexed.length >= 2)
          throw new Error("Mehr als zwei ColorIcon-Zustände.");
        const transparent = chunk.readUbyte(),
          colors = chunk.readUbyte() + 1;
        const flags = chunk.readUbyte(),
          imageCompression = chunk.readUbyte(),
          paletteCompression = chunk.readUbyte();
        const depth = chunk.readUbyte(),
          imageSize = chunk.readWord() + 1,
          paletteSize = chunk.readWord() + 1;
        if (
          depth < 1 ||
          depth > 8 ||
          imageCompression > 1 ||
          paletteCompression > 1
        )
          throw new Error("Unbekannte ColorIcon-Kompression oder Farbtiefe.");
        const imageData = chunk.readBytes(imageSize);
        const pixels = imageCompression
          ? unpackIconRLE(imageData, depth, width * height)
          : imageData;
        let palette = previousPalette;
        if (flags & 2) {
          const paletteData = chunk.readBytes(paletteSize);
          const rgb = paletteCompression
            ? unpackIconRLE(paletteData, 8, colors * 3)
            : paletteData;
          if (rgb.length !== colors * 3)
            throw new Error("Ungültige ColorIcon-Palettenlänge.");
          palette = Array.from({ length: colors }, (_, i) =>
            Array.from(rgb.slice(i * 3, i * 3 + 3)),
          );
        }
        if (!palette) throw new Error("ColorIcon-Palette fehlt.");
        previousPalette = palette;
        indexed.push(
          indexedRGBA(
            width,
            height,
            pixels,
            palette,
            flags & 1 ? transparent : -1,
          ),
        );
      }
    }
    // Unknown IFF chunks are bounded and skipped according to IFF conventions.
  }
  const states = argb.length ? argb : indexed;
  if (!states.length)
    throw new Error("ColorIcon enthält kein unterstütztes Bild.");
  return { format: argb.length ? "OS4 ARGB" : "ColorIcon / GlowIcon", states };
}

// NewIcons: 7-bit symbols and zero-run encoding. Every ToolType line resets
// the bit buffer. Palette data may span multiple lines; image starts next line.
function decodeNewLines(lines, first, depth, count) {
  const output = new Uint8Array(count);
  let out = 0;
  for (let line = first; line < lines.length; line++) {
    let value = 0,
      bits = 0;
    for (const character of lines[line]) {
      const code = character.charCodeAt(0);
      if (code < 32 || (code >= 128 && code < 160))
        throw new Error("Ungültiges NewIcon-Zeichen.");
      const symbol = code < 160 ? code - 32 : code < 209 ? code - 81 : 0;
      const repeat = code >= 209 ? code - 208 : 1;
      for (let r = 0; r < repeat; r++) {
        value = (value << 7) | symbol;
        bits += 7;
        while (bits >= depth) {
          bits -= depth;
          output[out++] = (value >>> bits) & ((1 << depth) - 1);
          if (out === count) return { output, nextLine: line + 1 };
        }
        value &= (1 << bits) - 1;
      }
    }
  }
  throw new Error("Unvollständige NewIcon-Palette oder Bilddaten.");
}
export function decodeNewIcons(toolTypes) {
  const states = [];
  for (const state of [1, 2]) {
    const lines = toolTypes
      .filter((v) => v.startsWith(`IM${state}=`))
      .map((v) => v.slice(4));
    if (!lines.length) {
      if (state === 1) throw new Error("NewIcon Normal Image fehlt.");
      break;
    }
    const header = lines[0];
    if (header.length < 5 || !["B", "C"].includes(header[0]))
      throw new Error("Ungültiger NewIcon-Kopf.");
    const width = header.charCodeAt(1) - 33,
      height = header.charCodeAt(2) - 33;
    const colors = (header.charCodeAt(3) - 33) * 64 + header.charCodeAt(4) - 33;
    validateDimensions(width, height, 1);
    if (colors < 1 || colors > 256)
      throw new Error("Ungültige NewIcon-Farbanzahl.");
    lines[0] = header.slice(5);
    const decoded = decodeNewLines(lines, 0, 8, colors * 3);
    const palette = Array.from({ length: colors }, (_, i) =>
      Array.from(decoded.output.slice(i * 3, i * 3 + 3)),
    );
    const depth = Math.max(1, Math.ceil(Math.log2(colors)));
    const { output } = decodeNewLines(
      lines,
      decoded.nextLine,
      depth,
      width * height,
    );
    states.push(
      indexedRGBA(width, height, output, palette, header[0] === "B" ? 0 : -1),
    );
  }
  return { format: "NewIcon", states };
}
