export const WB13_PALETTE = [
  [85, 170, 255],
  [255, 255, 255],
  [0, 0, 0],
  [255, 136, 0],
];
// Pens 4–7 are a preview extension, not a standard Workbench 1.3 palette.
export const EXTENDED_PALETTE = [
  ...WB13_PALETTE,
  [170, 170, 170],
  [85, 85, 85],
  [0, 170, 85],
  [170, 0, 170],
];
export function defaultPalette() {
  return EXTENDED_PALETTE.map((rgb) => rgb.slice());
}
export function hex(rgb) {
  return "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("");
}
export function fromHex(value) {
  return [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
}
export function nearestPen(r, g, b, palette) {
  let best = 0,
    distance = Infinity;
  palette.forEach(([pr, pg, pb], i) => {
    const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (d < distance) {
      distance = d;
      best = i;
    }
  });
  return best;
}
export function quantizeRGBA(data, palette, threshold = 128) {
  const pixels = new Uint8Array(data.length / 4);
  for (let i = 0; i < pixels.length; i++)
    pixels[i] =
      data[i * 4 + 3] < threshold
        ? 0
        : nearestPen(data[i * 4], data[i * 4 + 1], data[i * 4 + 2], palette);
  return pixels;
}
