// Classic field sequence adapted from Amiga-Icon-Editor/_script/lib/icon.js.
// Copyright (c) 2019-2021 Steffest - dev@stef.be. MIT: ../THIRD_PARTY_LICENSES.md.
import { BinaryStream } from "./binary-stream.js";
import {
  encode,
  decode,
  byteSize,
  validateDimensions,
  validatePixels,
} from "./amiga-bitplanes.js";
const NO_ICON_POSITION = 0x80000000;
const NEW_FORMAT =
  "Dieses Icon verwendet ein neueres Amiga-Iconformat. Version 1 unterstützt klassische Workbench-1.x-OldIcons.";
// Offsets follow m68k 2-byte structure alignment, NOT modern 4-byte alignment.
const fields = [
  ["version", "Word"],
  ["nextGadget", "DWord"],
  ["leftEdge", "Short"],
  ["topEdge", "Short"],
  ["width", "Word"],
  ["height", "Word"],
  ["flags", "Word"],
  ["activation", "Word"],
  ["gadgetType", "Word"],
  ["gadgetRender", "DWord"],
  ["selectRender", "DWord"],
  ["gadgetText", "DWord"],
  ["mutualExclude", "DWord"],
  ["specialInfo", "DWord"],
  ["gadgetID", "Word"],
  ["userData", "DWord"],
  ["type", "Ubyte"],
  ["padding", "Ubyte"],
  ["hasDefaultTool", "DWord"],
  ["hasToolTypes", "DWord"],
  ["currentX", "DWord"],
  ["currentY", "DWord"],
  ["hasDrawerData", "DWord"],
  ["hasToolWindow", "DWord"],
  ["stackSize", "DWord"],
];
const imageFields = [
  ["leftEdge", "Short"],
  ["topEdge", "Short"],
  ["width", "Word"],
  ["height", "Word"],
  ["depth", "Word"],
  ["imageData", "DWord"],
  ["planePick", "Ubyte"],
  ["planeOnOff", "Ubyte"],
  ["nextImage", "DWord"],
];
function readFields(stream, schema) {
  return Object.fromEntries(
    schema.map(([name, kind]) => [name, stream[`read${kind}`]()]),
  );
}
function writeFields(stream, schema, value) {
  for (const [name, kind] of schema) stream[`write${kind}`](value[name]);
}
function image(width, height, depth, pixels) {
  return {
    leftEdge: 0,
    topEdge: 0,
    width,
    height,
    depth,
    imageData: 1,
    planePick: (1 << depth) - 1,
    planeOnOff: 0,
    nextImage: 0,
    pixels:
      pixels === undefined ? new Uint8Array(width * height) : pixels.slice(),
  };
}
function textBytes(value) {
  if (
    typeof value !== "string" ||
    value.length > 4095 ||
    /[\u0000\u0100-\uffff]/.test(value)
  )
    throw new Error(
      "Amiga-Texte müssen Latin-1 ohne Nullzeichen sein (max. 4095 Zeichen).",
    );
  return value.length + 5;
}
function readText(stream) {
  const size = stream.readDWord();
  if (size < 1 || size > 4096) throw new Error("Ungültige Amiga-Textlänge.");
  const data = stream.readBytes(size);
  if (data[size - 1] !== 0 || data.subarray(0, -1).includes(0))
    throw new Error("Ungültiger Amiga-Textabschluss.");
  return Array.from(data.subarray(0, -1), (b) => String.fromCharCode(b)).join(
    "",
  );
}
function writeText(stream, value) {
  stream.writeDWord(value.length + 1);
  stream.writeString(value);
  stream.writeUbyte(0);
}
function readImage(stream) {
  const result = readFields(stream, imageFields);
  if (result.nextImage)
    throw new Error("Verkettete Image-Strukturen werden nicht unterstützt.");
  if (!result.imageData) throw new Error("ImageData fehlt.");
  result.pixels = decode(
    stream.readBytes(byteSize(result.width, result.height, result.depth)),
    result.width,
    result.height,
    result.depth,
    result.planePick,
    result.planeOnOff,
  );
  // Normalize mapped pens to contiguous planes, retaining original mapping as diagnostics.
  result.sourceDepth = result.depth;
  result.sourcePlanePick = result.planePick;
  result.sourcePlaneOnOff = result.planeOnOff;
  const highest = result.pixels.reduce((a, b) => Math.max(a, b), 0);
  result.depth = Math.max(result.depth, Math.ceil(Math.log2(highest + 1)), 1);
  result.planePick = (1 << result.depth) - 1;
  result.planeOnOff = 0;
  return result;
}
export const AmigaIcon = {
  NO_ICON_POSITION,
  WBDISK: 1,
  WBDRAWER: 2,
  WBTOOL: 3,
  WBPROJECT: 4,
  WBGARBAGE: 5,
  WBDEVICE: 6,
  WBKICK: 7,
  TYPES: {
    1: "WBDISK · Datenträger",
    2: "WBDRAWER · Ordner",
    3: "WBTOOL · Programm",
    4: "WBPROJECT · Projektdatei",
    5: "WBGARBAGE · Papierkorb",
    6: "WBDEVICE · Gerät",
    7: "WBKICK · Kickstart",
  },
  create(options = {}) {
    const { width = 48, height = 32, depth = 2 } = options;
    validateDimensions(width, height, depth);
    const defaults = Object.fromEntries(fields.map(([key]) => [key, 0]));
    return {
      ...defaults,
      version: 1,
      width,
      height,
      depth,
      flags: 6,
      activation: 3,
      gadgetType: 1,
      gadgetRender: 1,
      selectRender: 1,
      type: 3,
      stackSize: 16384,
      currentX: NO_ICON_POSITION,
      currentY: NO_ICON_POSITION,
      defaultTool: null,
      toolTypes: [],
      toolWindow: null,
      drawerData: null,
      ...options,
      normal: image(width, height, depth, options.normalPixels),
      selected:
        options.selectedPixels === null
          ? null
          : image(width, height, depth, options.selectedPixels),
      selectedEnabled: options.selectedPixels !== null,
    };
  },
  validate(icon) {
    validateDimensions(icon.width, icon.height, icon.depth);
    if (!Number.isInteger(icon.type) || !this.TYPES[icon.type])
      throw new Error("Ungültiger Icon Type.");
    if (
      !Number.isInteger(icon.stackSize) ||
      icon.stackSize < 1 ||
      icon.stackSize > 0x7fffffff
    )
      throw new Error(
        "StackSize muss ein positiver Integer bis 2147483647 sein.",
      );
    if (icon.version !== 1)
      throw new Error("Nur DiskObject-Version 1 wird unterstützt.");
    if ([1, 2, 5].includes(icon.type) && !icon.drawerData)
      throw new Error(
        "Dieser Typ benötigt DrawerData. Bitte ein klassisches Drawer-Icon als Vorlage öffnen.",
      );
    if (
      icon.drawerData &&
      (!(icon.drawerData instanceof Uint8Array) ||
        icon.drawerData.length !== 56)
    )
      throw new Error("Klassische DrawerData müssen genau 56 Bytes enthalten.");
    if (!icon.normal) throw new Error("Normal Image fehlt.");
    if (icon.selectedEnabled !== false && !icon.selected)
      throw new Error("Selected Image fehlt.");
    for (const img of [
      icon.normal,
      icon.selectedEnabled === false ? null : icon.selected,
    ].filter(Boolean)) {
      validatePixels(img.pixels, img.width, img.height, img.depth);
      if (img.depth > icon.depth)
        throw new Error("Image-Depth übersteigt die Icon-Depth.");
      if (
        img.nextImage ||
        img.planePick !== (1 << img.depth) - 1 ||
        img.planeOnOff !== 0
      )
        throw new Error("Nicht normalisierte Image-Struktur.");
      if (
        img.width + img.leftEdge > icon.width ||
        img.height + img.topEdge > icon.height ||
        img.leftEdge < 0 ||
        img.topEdge < 0
      )
        throw new Error("Image liegt außerhalb der Gadget-Fläche.");
    }
    for (const coord of [icon.currentX, icon.currentY])
      if (!Number.isInteger(coord) || coord < -0x80000000 || coord > 0xffffffff)
        throw new Error("Ungültige Workbench-Position.");
    if (!Array.isArray(icon.toolTypes) || icon.toolTypes.length > 1024)
      throw new Error("Zu viele ToolTypes.");
    for (const value of [
      icon.defaultTool,
      icon.toolWindow,
      ...icon.toolTypes,
    ].filter((v) => v !== null))
      textBytes(value);
    if (icon.toolTypes.some((v) => /^IM[12]=/.test(v)))
      throw new Error(NEW_FORMAT);
  },
  write(icon) {
    this.validate(icon);
    const selected = icon.selectedEnabled === false ? null : icon.selected;
    const images = [icon.normal, selected].filter(Boolean);
    let size = 78 + (icon.drawerData ? 56 : 0);
    for (const img of images)
      size += 20 + byteSize(img.width, img.height, img.depth);
    for (const value of [
      icon.defaultTool,
      icon.toolWindow,
      ...icon.toolTypes,
    ].filter((v) => v !== null))
      size += textBytes(value);
    if (icon.toolTypes.length) size += 4;
    const stream = new BinaryStream(new ArrayBuffer(size));
    stream.writeWord(0xe310);
    // On disk pointers are presence markers, not offsets. Payloads follow sequentially.
    const header = {
      ...icon,
      userData: 0,
      nextGadget: 0,
      gadgetText: 0,
      mutualExclude: 0,
      specialInfo: 0,
      gadgetID: 0,
      padding: 0,
      activation: 3,
      gadgetType: 1,
      flags: selected ? 6 : 4,
      gadgetRender: 1,
      selectRender: selected ? 1 : 0,
      hasDefaultTool: icon.defaultTool !== null ? 1 : 0,
      hasToolTypes: icon.toolTypes.length ? 1 : 0,
      hasDrawerData: icon.drawerData ? 1 : 0,
      hasToolWindow: icon.toolWindow !== null ? 1 : 0,
      currentX: icon.currentX >>> 0,
      currentY: icon.currentY >>> 0,
    };
    writeFields(stream, fields, header);
    if (icon.drawerData) stream.writeBytes(icon.drawerData);
    for (const img of images) {
      writeFields(stream, imageFields, { ...img, imageData: 1, nextImage: 0 });
      stream.writeBytes(encode(img.pixels, img.width, img.height, img.depth));
    }
    if (icon.defaultTool !== null) writeText(stream, icon.defaultTool);
    if (icon.toolTypes.length) {
      stream.writeDWord((icon.toolTypes.length + 1) * 4);
      for (const value of icon.toolTypes) writeText(stream, value);
    }
    if (icon.toolWindow !== null) writeText(stream, icon.toolWindow);
    if (stream.index !== size)
      throw new Error("Interner Fehler: Dateigröße stimmt nicht.");
    return stream.buffer;
  },
  parse(buffer) {
    const stream = new BinaryStream(buffer);
    if (stream.length >= 4 && stream.view.getUint32(0) === 0x89504e47)
      throw new Error(NEW_FORMAT);
    if (stream.readWord() !== 0xe310)
      throw new Error("Ungültige .info-Datei: Magic E310 fehlt.");
    const icon = readFields(stream, fields);
    if (icon.version !== 1) throw new Error("Unbekannte DiskObject-Version.");
    if (icon.userData !== 0) throw new Error(NEW_FORMAT);
    if (!(icon.flags & 4))
      throw new Error("Border-Gadgets werden nicht unterstützt.");
    if (!icon.gadgetRender) throw new Error("Normal Image fehlt.");
    icon.drawerData = icon.hasDrawerData ? stream.readBytes(56) : null;
    icon.normal = readImage(stream);
    icon.selected = icon.selectRender ? readImage(stream) : null;
    icon.selectedEnabled = !!icon.selected;
    icon.depth = Math.max(icon.normal.depth, icon.selected?.depth || 1);
    icon.defaultTool = icon.hasDefaultTool ? readText(stream) : null;
    icon.toolTypes = [];
    if (icon.hasToolTypes) {
      const size = stream.readDWord();
      if (size < 4 || size % 4 || size > 4100)
        throw new Error("Ungültige ToolTypes-Länge.");
      for (let i = 0; i < size / 4 - 1; i++)
        icon.toolTypes.push(readText(stream));
    }
    icon.toolWindow = icon.hasToolWindow ? readText(stream) : null;
    if (icon.toolTypes.some((value) => /^IM[12]=/.test(value)))
      throw new Error(NEW_FORMAT);
    if (stream.index !== stream.length) {
      const rest = stream.readString(
        Math.min(12, stream.length - stream.index),
      );
      if (rest.startsWith("FORM") || rest.startsWith("ARGB"))
        throw new Error(NEW_FORMAT);
      throw new Error("Nicht unterstützte Zusatzdaten am Dateiende.");
    }
    // Zero stack is valid in legacy files (Workbench chooses its default).
    const stack = icon.stackSize;
    if (stack === 0) icon.stackSize = 4096;
    this.validate(icon);
    icon.stackSize = stack;
    return icon;
  },
};

// Read the shared DiskObject container without interpreting modern image payloads.
// Kept separate from the strict classic parse()/write() API.
export function readIconContainer(buffer) {
  const stream = new BinaryStream(buffer);
  if (stream.readWord() !== 0xe310)
    throw new Error("Ungültige .info-Datei: Magic E310 fehlt.");
  const icon = readFields(stream, fields);
  if (icon.version !== 1) throw new Error("Unbekannte DiskObject-Version.");
  if (!(icon.flags & 4))
    throw new Error("Border-Gadgets werden nicht unterstützt.");
  const readPlanar = () => {
    const img = readFields(stream, imageFields);
    validateDimensions(img.width, img.height, 1);
    if (img.depth > 8 || img.nextImage)
      throw new Error("Nicht unterstützte klassische Image-Struktur.");
    const size = Math.ceil(img.width / 16) * 2 * img.height * img.depth;
    img.data = stream.readBytes(img.imageData ? size : 0);
    if (img.depth && !img.imageData) throw new Error("ImageData fehlt.");
    return img;
  };
  icon.drawerData = icon.hasDrawerData ? stream.readBytes(56) : null;
  icon.normal = icon.gadgetRender ? readPlanar() : null;
  icon.selected = icon.selectRender ? readPlanar() : null;
  icon.defaultTool = icon.hasDefaultTool ? readText(stream) : null;
  icon.toolTypes = [];
  if (icon.hasToolTypes) {
    const size = stream.readDWord();
    if (size < 4 || size % 4 || size > 4100)
      throw new Error("Ungültige ToolTypes-Länge.");
    for (let i = 0; i < size / 4 - 1; i++)
      icon.toolTypes.push(readText(stream));
  }
  icon.toolWindow = icon.hasToolWindow ? readText(stream) : null;
  icon.drawerData2 =
    icon.drawerData && icon.userData & 255 ? stream.readBytes(6) : null;
  icon.extension = stream.readBytes(stream.length - stream.index);
  return icon;
}
