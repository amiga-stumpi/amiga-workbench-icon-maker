import { appError, t } from "./i18n.js";
import { AmigaIcon, readIconContainer } from "./amiga-icon.js";
import {
  decodeColorIcon,
  decodeNewIcons,
  indexedRGBA,
} from "./modern-icon-codecs.js";
import { isPNG, splitPNGIcon, pngRGBA } from "./png-icon.js";
import { defaultPalette, quantizeRGBA } from "./palette.js";

// Classic icons contain no palette. This conventional OS2+/MagicWB preview
// palette follows the MIT reference; users can adjust the target palette.
const OS2_PALETTE = [
  [149, 149, 149],
  [0, 0, 0],
  [255, 255, 255],
  [59, 103, 162],
  [123, 123, 123],
  [175, 175, 175],
  [170, 144, 124],
  [255, 169, 151],
];
function planarRGBA(img) {
  if (!img) return null;
  if (img.depth > 3 || img.planePick > 7 || img.planeOnOff > 7)
    throw appError(
      "Planare Icons ohne eingebettete Palette unterstützen maximal 8 Pens.",
    );
  const planes = [0, 1, 2].filter((p) => img.planePick & (1 << p));
  if (planes.length !== img.depth)
    throw appError("PlanePick passt nicht zur Image-Depth.");
  const pixels = new Uint8Array(img.width * img.height).fill(
    img.planeOnOff & ~img.planePick & 7,
  );
  const row = Math.ceil(img.width / 16) * 2;
  for (let p = 0; p < img.depth; p++)
    for (let y = 0; y < img.height; y++)
      for (let x = 0; x < img.width; x++)
        pixels[y * img.width + x] |=
          ((img.data[(p * img.height + y) * row + (x >> 3)] >> (7 - (x & 7))) &
            1) <<
          planes[p];
  return {
    ...indexedRGBA(img.width, img.height, pixels, OS2_PALETTE, 0),
    leftEdge: img.leftEdge,
    topEdge: img.topEdge,
  };
}
function cleanToolTypes(values = []) {
  return values.filter(
    (v) =>
      !/^IM[12]=/.test(v) && v !== "*** DON'T EDIT THE FOLLOWING LINES!! ***",
  );
}
function fitState(state, width, height, palette, alpha) {
  const pixels = quantizeRGBA(state.rgba, palette, alpha),
    output = new Uint8Array(width * height);
  for (let y = 0; y < state.height; y++)
    for (let x = 0; x < state.width; x++) {
      const dx = x + (state.leftEdge || 0),
        dy = y + (state.topEdge || 0);
      if (dx < 0 || dy < 0 || dx >= width || dy >= height)
        throw appError("Icon-Bild liegt außerhalb der bearbeitbaren Fläche.");
      output[dy * width + dx] = pixels[y * state.width + x];
    }
  return output;
}
export async function importIcon(
  buffer,
  { depth = 2, palette = defaultPalette(), alpha = 128 } = {},
) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength > 32 * 1024 * 1024)
    throw appError("Icon ist zu groß (maximal 32 MiB).");
  if (
    !Number.isInteger(depth) ||
    depth < 1 ||
    depth > 3 ||
    palette.length < 2 ** depth
  )
    throw appError("Ungültige Zielpalette oder Farbtiefe.");
  if (!Number.isInteger(alpha) || alpha < 0 || alpha > 255)
    throw appError("Alpha-Schwellenwert muss zwischen 0 und 255 liegen.");
  const notices = [];
  let decoded,
    source = {};
  if (isPNG(new Uint8Array(buffer))) {
    const png = splitPNGIcon(buffer);
    const states = [];
    for (const image of png.images) states.push(await pngRGBA(image));
    decoded = { format: png.format, states };
    notices.push(...png.notices);
    if (png.images.some((img) => img.width > 256 || img.height > 256))
      notices.push(t("PNG auf maximal 256 × 256 Pixel eingepasst."));
  } else {
    source = readIconContainer(buffer);
    const hasNewIcon = source.toolTypes.some((v) => /^IM[12]=/.test(v));
    if (source.extension.length)
      decoded = await decodeColorIcon(source.extension);
    else if (hasNewIcon) decoded = decodeNewIcons(source.toolTypes);
    else if (source.userData === 0) return AmigaIcon.parse(buffer);
    else {
      if ((source.userData & 255) > 1)
        throw appError("Unbekannte planare Icon-Revision.");
      decoded = {
        format: "OS2+/OS3 / MagicWB",
        states: [planarRGBA(source.normal), planarRGBA(source.selected)].filter(
          Boolean,
        ),
      };
      notices.push(
        t(
          "Planare Quellfarben anhand der OS2+/MagicWB-Vorschaupalette interpretiert.",
        ),
      );
    }
    if (source.drawerData2)
      notices.push(
        t("OS2+-Drawer-Ansichtsoptionen entfallen beim klassischen Export."),
      );
  }
  if (!decoded.states.length) throw appError("Normal Image fehlt.");
  const width = Math.max(
    ...decoded.states.map((img) => img.width + (img.leftEdge || 0)),
  );
  const height = Math.max(
    ...decoded.states.map((img) => img.height + (img.topEdge || 0)),
  );
  const targetPalette = palette.slice(0, 2 ** depth);
  const icon = AmigaIcon.create({
    width,
    height,
    depth,
    normalPixels: fitState(
      decoded.states[0],
      width,
      height,
      targetPalette,
      alpha,
    ),
    selectedPixels: decoded.states[1]
      ? fitState(decoded.states[1], width, height, targetPalette, alpha)
      : null,
    type:
      source.type && AmigaIcon.TYPES[source.type]
        ? source.type
        : AmigaIcon.WBTOOL,
    stackSize:
      source.stackSize > 0 && source.stackSize <= 0x7fffffff
        ? source.stackSize
        : 16384,
    currentX: source.currentX ?? AmigaIcon.NO_ICON_POSITION,
    currentY: source.currentY ?? AmigaIcon.NO_ICON_POSITION,
    defaultTool: source.defaultTool ?? null,
    toolTypes: cleanToolTypes(source.toolTypes),
    toolWindow: source.toolWindow ?? null,
    drawerData: source.drawerData ?? null,
  });
  if (source.type && !AmigaIcon.TYPES[source.type])
    notices.push(t("Nicht unterstützter Icon Type wurde auf WBTOOL gesetzt."));
  icon.sourceFormat = decoded.format;
  icon.importNotice = t(
    "{format} → {pens} Pens der gewählten Palette. Farben/Transparenz wurden reduziert. Export als klassisches WB1.x-.info, nicht im Quellformat. {notices}",
    { format: decoded.format, pens: 2 ** depth, notices: notices.join(" ") },
  ).trim();
  return icon;
}
