import { validateDimensions, validatePixels } from "./amiga-bitplanes.js";
export function resizeIcon(icon, width, height, depth) {
  validateDimensions(width, height, depth);
  for (const img of [icon.normal, icon.selected].filter(Boolean))
    validatePixels(img.pixels, img.width, img.height, depth);
  for (const img of [icon.normal, icon.selected].filter(Boolean)) {
    const pixels = new Uint8Array(width * height);
    for (let y = 0; y < img.height; y++)
      for (let x = 0; x < img.width; x++) {
        const dx = x + img.leftEdge,
          dy = y + img.topEdge;
        if (dx >= 0 && dx < width && dy >= 0 && dy < height)
          pixels[dy * width + dx] = img.pixels[y * img.width + x];
      }
    Object.assign(img, {
      pixels,
      width,
      height,
      depth,
      leftEdge: 0,
      topEdge: 0,
      planePick: (1 << depth) - 1,
      planeOnOff: 0,
    });
  }
  Object.assign(icon, { width, height, depth });
}
export function generateSelected(pixels, depth, mode) {
  const max = (1 << depth) - 1;
  if (mode === "swap13" && depth < 2)
    throw new Error("Pen 3 benötigt mindestens 2 Bitplanes.");
  if (mode === "swap12" && depth < 2)
    throw new Error("Pen 2 benötigt mindestens 2 Bitplanes.");
  return pixels.map((p) =>
    mode === "invert"
      ? max - p
      : mode === "swap12"
        ? p === 1
          ? 2
          : p === 2
            ? 1
            : p
        : mode === "swap13"
          ? p === 1
            ? 3
            : p === 3
              ? 1
              : p
          : p,
  );
}
export function transform(img, mode) {
  const result = new Uint8Array(img.pixels.length),
    { width: w, height: h } = img;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let sx = x,
        sy = y;
      if (mode === "mirrorH") sx = w - 1 - x;
      if (mode === "mirrorV") sy = h - 1 - y;
      if (mode === "left") sx = x + 1;
      if (mode === "right") sx = x - 1;
      if (mode === "up") sy = y + 1;
      if (mode === "down") sy = y - 1;
      if (sx >= 0 && sx < w && sy >= 0 && sy < h)
        result[y * w + x] = img.pixels[sy * w + sx];
    }
  return result;
}
