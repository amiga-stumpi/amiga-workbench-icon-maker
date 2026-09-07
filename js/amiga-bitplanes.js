export function validateDimensions(width, height, depth) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 256 ||
    height > 256
  )
    throw new RangeError(
      "Breite und Höhe müssen ganze Zahlen zwischen 1 und 256 sein.",
    );
  if (!Number.isInteger(depth) || depth < 1 || depth > 3)
    throw new RangeError("Depth muss zwischen 1 und 3 Bitplanes liegen.");
}
export function byteSize(width, height, depth) {
  validateDimensions(width, height, depth);
  return Math.ceil(width / 16) * 2 * height * depth;
}
export function validatePixels(pixels, width, height, depth) {
  validateDimensions(width, height, depth);
  if (!pixels || pixels.length !== width * height)
    throw new Error("Pixelanzahl passt nicht zur Bildgröße.");
  for (const pen of pixels) {
    if (!Number.isInteger(pen) || pen < 0 || pen >= 2 ** depth)
      throw new RangeError(
        `Pen ${pen} kann bei ${depth} Bitplanes nicht gespeichert werden.`,
      );
  }
}
export function encode(pixels, width, height, depth) {
  validatePixels(pixels, width, height, depth);
  const rowBytes = Math.ceil(width / 16) * 2;
  const bytes = new Uint8Array(byteSize(width, height, depth));
  for (let plane = 0; plane < depth; plane++) {
    for (let y = 0; y < height; y++) {
      // Address source by x/y: padding never consumes pixels of the next row.
      for (let x = 0; x < width; x++) {
        const bit = (pixels[y * width + x] >> plane) & 1;
        bytes[(plane * height + y) * rowBytes + (x >> 3)] |=
          bit << (7 - (x & 7));
      }
    }
  }
  return bytes;
}
export function decode(
  bytes,
  width,
  height,
  depth,
  planePick = (1 << depth) - 1,
  planeOnOff = 0,
) {
  if (bytes.length !== byteSize(width, height, depth))
    throw new Error("Ungültige Bitplane-Datenlänge.");
  // Image planes are assigned in order to set bits of PlanePick.
  if (
    !Number.isInteger(planePick) ||
    planePick < 0 ||
    planePick > 7 ||
    !Number.isInteger(planeOnOff) ||
    planeOnOff < 0 ||
    planeOnOff > 7
  )
    throw new Error("PlanePick/PlaneOnOff außerhalb der unterstützten 8 Pens.");
  const picks = [0, 1, 2].filter((p) => planePick & (1 << p));
  if (picks.length !== depth)
    throw new Error("PlanePick passt nicht zur gespeicherten Depth.");
  const pixels = new Uint8Array(width * height).fill(
    planeOnOff & ~planePick & 7,
  );
  const rowBytes = Math.ceil(width / 16) * 2;
  for (let plane = 0; plane < depth; plane++)
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++)
        pixels[y * width + x] |=
          ((bytes[(plane * height + y) * rowBytes + (x >> 3)] >>
            (7 - (x & 7))) &
            1) <<
          picks[plane];
  return pixels;
}
