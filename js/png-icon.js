import { appError, t } from "./i18n.js";
import { BinaryStream } from "./binary-stream.js";

const crcTable = Uint32Array.from({ length: 256 }, (_, i) => {
  let crc = i;
  for (let bit = 0; bit < 8; bit++)
    crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  return crc >>> 0;
});
export function pngCRC(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 255];
  return (crc ^ 0xffffffff) >>> 0;
}
export function isPNG(bytes) {
  return (
    bytes.length >= 8 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)
  );
}
// PNG images may be concatenated directly; use chunk boundaries, not a byte search.
export function splitPNGIcon(buffer) {
  const stream = new BinaryStream(buffer),
    images = [],
    notices = [];
  while (stream.index < stream.length) {
    const start = stream.index;
    if (images.length === 2 || !isPNG(stream.readBytes(8)))
      throw appError("Ungültiger PNG-/DualPNG-Container.");
    let width,
      height,
      complete = false,
      metadata = null;
    while (stream.index < stream.length) {
      const length = stream.readDWord(),
        kind = stream.readString(4);
      const data = stream.readBytes(length),
        expectedCRC = stream.readDWord();
      const checksumBytes = new Uint8Array(
        buffer,
        stream.index - length - 8,
        length + 4,
      );
      if (pngCRC(checksumBytes) !== expectedCRC)
        throw appError("PNG-Icon enthält einen ungültigen CRC-Prüfwert.");
      if (!width && kind !== "IHDR") throw appError("PNG-IHDR fehlt.");
      if (kind === "IHDR") {
        if (width || length !== 13) throw appError("Ungültiger PNG-IHDR.");
        const view = new DataView(data.buffer);
        width = view.getUint32(0);
        height = view.getUint32(4);
        if (!width || !height || width * height > 16777216)
          throw appError(
            "PNG-Icon überschreitet 16 Megapixel oder hat ungültige Maße.",
          );
      }
      if (kind === "icOn") metadata = data;
      if (kind === "IEND") {
        if (length) throw appError("Ungültiger PNG-IEND.");
        complete = true;
        break;
      }
    }
    if (!complete) throw appError("PNG-Icon ist abgeschnitten.");
    images.push({
      width,
      height,
      bytes: buffer.slice(start, stream.index),
      metadata,
    });
  }
  if (!images.length) throw appError("PNG-Bild fehlt.");
  // icOn encodings vary between systems; do not silently guess icon type/tool data.
  if (images.some((img) => img.metadata))
    notices.push(
      t(
        "PNG-icOn-Metadaten werden nicht übernommen; Icon Type und Startparameter bitte prüfen.",
      ),
    );
  return {
    images,
    notices,
    format: images.length === 2 ? "DualPNG" : "PNG-Icon",
  };
}

export async function pngRGBA(image) {
  const url = URL.createObjectURL(
    new Blob([image.bytes], { type: "image/png" }),
  );
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () =>
        reject(appError("PNG-Icon konnte nicht dekodiert werden."));
      img.src = url;
    });
    if (img.width !== image.width || img.height !== image.height)
      throw appError("PNG-Maße stimmen nicht.");
    // Large PNGs are fitted into the editor limit while retaining aspect ratio.
    const scale = Math.min(1, 256 / img.width, 256 / img.height);
    const width = Math.max(1, Math.round(img.width * scale)),
      height = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, width, height);
    return { width, height, rgba: ctx.getImageData(0, 0, width, height).data };
  } finally {
    URL.revokeObjectURL(url);
  }
}
