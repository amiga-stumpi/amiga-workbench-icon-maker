import { appError, t, errorMessage, localizePage } from "./i18n.js";
import { importIcon } from "./icon-import.js";
import { AmigaIcon } from "./amiga-icon.js";
import { defaultPalette, hex, fromHex } from "./palette.js";
import { History } from "./history.js";
import { PixelEditor } from "./pixel-editor.js";
import {
  importPNG,
  pixelsToCanvas,
  download,
  iconFilename,
} from "./image-import.js";
import {
  resizeIcon,
  generateSelected,
  transform,
} from "./editor-operations.js";
localizePage();
const $ = (id) => document.getElementById(id);
let state = {
  icon: AmigaIcon.create(),
  name: "MyProgram",
  palette: defaultPalette(),
};
let active = "normal",
  pen = 1,
  tool = "pencil",
  pngTarget = "normal",
  revision = 0;
let sizeDraft = null;
const history = new History(60);
history.reset(state);
const editors = {};
function message(text, error = false) {
  $("status").textContent = text;
  $("status").classList.toggle("error", error);
}
function guard(action) {
  return async (...args) => {
    try {
      await action(...args);
    } catch (e) {
      message(errorMessage(e), true);
    }
  };
}
function setActive(key) {
  active = key;
  $("active-label").textContent =
    key === "normal" ? t("Normal") : t("Selected");
  for (const id of ["normal", "selected"])
    $(`${id}-panel`).classList.toggle("active", id === key);
}
function commit(text) {
  revision++;
  history.push(state);
  render();
  if (text) message(text);
}
function mutate(action, text) {
  const before = structuredClone(state);
  try {
    action();
    commit(text);
  } catch (e) {
    state = before;
    render();
    throw e;
  }
}
function renderPalette() {
  $("palette").replaceChildren();
  for (let i = 0; i < 2 ** state.icon.depth; i++) {
    const group = document.createElement("div");
    group.className = "pen";
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-pressed", String(pen === i));
    button.setAttribute("aria-label", t("Pen {pen} wählen", { pen: i }));
    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.backgroundColor = hex(state.palette[i]);
    button.append(swatch, document.createTextNode(`Pen ${i}`));
    button.addEventListener("click", () => {
      pen = i;
      renderPalette();
    });
    const color = document.createElement("input");
    color.type = "color";
    color.value = hex(state.palette[i]);
    color.setAttribute("aria-label", t("Vorschaufarbe Pen {pen}", { pen: i }));
    color.addEventListener("change", () =>
      mutate(() => {
        state.palette[i] = fromHex(color.value);
      }, t("Vorschaufarbe geändert. Die Palette wird nicht in .info gespeichert.")),
    );
    group.append(button, color);
    $("palette").append(group);
  }
  for (const id of ["swap-a", "swap-b"]) {
    const previous = $(id).value;
    $(id).replaceChildren();
    for (let i = 0; i < 2 ** state.icon.depth; i++)
      $(id).add(new Option(String(i), String(i)));
    $(id).value =
      previous !== "" && Number(previous) < 2 ** state.icon.depth
        ? previous
        : id === "swap-b"
          ? "1"
          : "0";
  }
}
function render() {
  const icon = state.icon;
  $("import-note").hidden = !icon.importNotice;
  $("import-note").textContent = icon.importNotice || "";
  if (pen >= 2 ** icon.depth) pen = 0;
  for (const [id, value] of Object.entries({
    name: state.name,
    type: icon.type,
    width: icon.width,
    height: icon.height,
    depth: icon.depth,
    "stack-size": icon.stackSize,
    "default-tool": icon.defaultTool || "",
    "tool-types": icon.toolTypes.join("\n"),
  }))
    $(id).value = value;
  if (sizeDraft)
    for (const [id, value] of Object.entries(sizeDraft)) $(id).value = value;
  const automatic =
    icon.currentX === AmigaIcon.NO_ICON_POSITION &&
    icon.currentY === AmigaIcon.NO_ICON_POSITION;
  $("automatic").checked = automatic;
  for (const [id, value] of [
    ["current-x", icon.currentX],
    ["current-y", icon.currentY],
  ]) {
    $(id).disabled = automatic;
    $(id).value = value === AmigaIcon.NO_ICON_POSITION ? 0 : value | 0;
  }
  $("selected-enabled").checked = icon.selectedEnabled;
  $("selected-panel").classList.toggle("excluded", !icon.selectedEnabled);
  $("undo").disabled = !history.canUndo;
  $("redo").disabled = !history.canRedo;
  renderPalette();
  for (const key of ["normal", "selected"]) {
    editors[key]?.render();
    const preview = $(`${key}-preview`),
      img = icon[key];
    if (img) {
      const source = pixelsToCanvas(img, state.palette);
      preview.width = source.width;
      preview.height = source.height;
      preview.getContext("2d").drawImage(source, 0, 0);
    }
    $(`${key}-panel`).querySelector(".image-size").textContent =
      `${img.width} × ${img.height}`;
  }
  const pos = (n) =>
    `0x${(n >>> 0).toString(16).padStart(8, "0").toUpperCase()}`;
  $("metadata").textContent = t("metadata", {
    version: icon.version,
    type: icon.type,
    typeName: AmigaIcon.TYPES[icon.type].split(" · ")[0],
    width: icon.width,
    height: icon.height,
    depth: icon.depth,
    pens: 2 ** icon.depth,
    stack: icon.stackSize,
    x: pos(icon.currentX),
    y: pos(icon.currentY),
    userData: icon.userData,
    planePick: (1 << icon.depth) - 1,
    drawer: icon.drawerData ? "56 Bytes" : t("keine"),
    selected: icon.selectedEnabled ? t("ja") : t("deaktiviert"),
  });
}
for (const key of ["normal", "selected"]) {
  editors[key] = new PixelEditor($(`${key}-canvas`), {
    getImage: () => state.icon[key],
    getPalette: () => state.palette,
    getTool: () => tool,
    getPen: () => pen,
    onPick: (value) => {
      pen = value;
      renderPalette();
    },
    onCommit: () => commit(t("Pixel bearbeitet.")),
    onActive: () => setActive(key),
  });
  editors[key].zoom = Number($("zoom").value);
}
for (const [value, label] of Object.entries(AmigaIcon.TYPES))
  $("type").add(
    new Option(label.split(" · ")[0] + " · " + t(label.split(" · ")[1]), value),
  );
for (const button of document.querySelectorAll("[data-tool]"))
  button.addEventListener("click", () => {
    tool = button.dataset.tool;
    for (const b of document.querySelectorAll("[data-tool]"))
      b.setAttribute("aria-pressed", String(b === button));
  });
$("zoom").addEventListener("change", () => {
  for (const editor of Object.values(editors)) {
    editor.zoom = Number($("zoom").value);
    editor.render();
  }
});
$("grid").addEventListener("change", () => {
  for (const editor of Object.values(editors)) {
    editor.grid = $("grid").checked;
    editor.render();
  }
});
$("preset").addEventListener("click", () =>
  mutate(() => {
    sizeDraft = null;
    state.icon = AmigaIcon.create();
    state.palette = defaultPalette();
  }, t("Workbench 1.3 Tool Icon angelegt. Vorheriger Stand bleibt über Undo erreichbar.")),
);
$("reset-palette").addEventListener("click", () =>
  mutate(() => {
    state.palette = defaultPalette();
  }, t("Workbench-Palette zurückgesetzt.")),
);
$("name").addEventListener("change", () =>
  mutate(() => {
    state.name = $("name").value;
  }, t("Dateiname geändert.")),
);
$("type").addEventListener("change", () => {
  mutate(() => {
    state.icon.type = Number($("type").value);
  }, t("Icon Type geändert."));
  if ([1, 2, 5].includes(state.icon.type) && !state.icon.drawerData)
    message(
      t(
        "Dieser Typ benötigt DrawerData. Öffne eine klassische passende .info als Vorlage; Export ist ohne DrawerData gesperrt.",
      ),
      true,
    );
});
for (const id of ["width", "height", "depth"])
  $(id).addEventListener("input", () => {
    sizeDraft = Object.fromEntries(
      ["width", "height", "depth"].map((key) => [key, $(key).value]),
    );
  });
$("apply-size").addEventListener(
  "click",
  guard(() =>
    mutate(() => {
      resizeIcon(
        state.icon,
        Number($("width").value),
        Number($("height").value),
        Number($("depth").value),
      );
      sizeDraft = null;
    }, t("Größe und Tiefe angewendet.")),
  ),
);
$("stack-size").addEventListener(
  "change",
  guard(() => {
    const value = Number($("stack-size").value);
    if (!Number.isInteger(value) || value < 1 || value > 0x7fffffff)
      throw appError(
        "StackSize muss ein positiver Integer bis 2147483647 sein.",
      );
    mutate(() => {
      state.icon.stackSize = value;
    }, t("StackSize geändert."));
  }),
);
$("automatic").addEventListener("change", () =>
  mutate(() => {
    state.icon.currentX = state.icon.currentY = $("automatic").checked
      ? AmigaIcon.NO_ICON_POSITION
      : 0;
  }, t("Workbench-Position geändert.")),
);
for (const [id, key] of [
  ["current-x", "currentX"],
  ["current-y", "currentY"],
])
  $(id).addEventListener(
    "change",
    guard(() =>
      mutate(() => {
        const value = Number($(id).value);
        if (
          !Number.isInteger(value) ||
          value < -0x7fffffff ||
          value > 0x7fffffff
        )
          throw appError(
            "Position muss ein gültiger signed 32-Bit-Integer sein.",
          );
        state.icon[key] = value >>> 0;
      }, t("Position geändert.")),
    ),
  );
$("selected-enabled").addEventListener("change", () =>
  mutate(() => {
    state.icon.selectedEnabled = $("selected-enabled").checked;
  }, t("Selected-Export geändert.")),
);
for (const [id, key] of [
  ["default-tool", "defaultTool"],
  ["tool-types", "toolTypes"],
])
  $(id).addEventListener(
    "change",
    guard(() =>
      mutate(() => {
        const value = $(id).value;
        state.icon[key] =
          key === "toolTypes"
            ? value.split(/\r?\n/).filter(Boolean)
            : value || null;
      }, t("Amiga-Metadaten geändert.")),
    ),
  );
function restore(direction) {
  const next = history[direction]();
  if (next) {
    sizeDraft = null;
    state = next;
    revision++;
    render();
    message(
      direction === "undo"
        ? t("Schritt rückgängig gemacht.")
        : t("Schritt wiederhergestellt."),
    );
  }
}
$("undo").addEventListener("click", () => restore("undo"));
$("redo").addEventListener("click", () => restore("redo"));
document.addEventListener("keydown", (e) => {
  if ($("info-dialog").open) return;
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if ((e.ctrlKey || e.metaKey) && ["z", "y"].includes(e.key.toLowerCase())) {
    e.preventDefault();
    restore(e.key.toLowerCase() === "y" || e.shiftKey ? "redo" : "undo");
  }
});
function copy(from, to) {
  mutate(
    () => {
      state.icon[to] = structuredClone(state.icon[from]);
      if (to === "selected") state.icon.selectedEnabled = true;
    },
    t("{state} kopiert.", {
      state: from === "normal" ? t("Normal") : t("Selected"),
    }),
  );
}
$("copy-to-selected").addEventListener("click", () =>
  copy("normal", "selected"),
);
$("copy-to-normal").addEventListener("click", () => copy("selected", "normal"));
$("generate").addEventListener(
  "click",
  guard(() =>
    mutate(() => {
      state.icon.selected = structuredClone(state.icon.normal);
      state.icon.selected.pixels = generateSelected(
        state.icon.normal.pixels,
        state.icon.depth,
        $("selected-mode").value,
      );
      state.icon.selectedEnabled = true;
    }, t("Selected erzeugt und bereit zur manuellen Bearbeitung.")),
  ),
);
for (const button of document.querySelectorAll("[data-clear]"))
  button.addEventListener("click", () =>
    mutate(
      () => state.icon[button.dataset.clear].pixels.fill(0),
      t("Bild mit Pen 0 geleert. Undo stellt es wieder her."),
    ),
  );
for (const button of document.querySelectorAll("[data-transform]"))
  button.addEventListener("click", () =>
    mutate(() => {
      state.icon[active].pixels = transform(
        state.icon[active],
        button.dataset.transform,
      );
    }, t("Bild transformiert.")),
  );
$("swap-pens").addEventListener("click", () =>
  mutate(() => {
    const a = Number($("swap-a").value),
      b = Number($("swap-b").value);
    state.icon[active].pixels = state.icon[active].pixels.map((p) =>
      p === a ? b : p === b ? a : p,
    );
  }, t("Pens getauscht.")),
);
function ensureAppliedSize() {
  if (
    Number($("width").value) !== state.icon.width ||
    Number($("height").value) !== state.icon.height ||
    Number($("depth").value) !== state.icon.depth
  )
    throw appError("Bitte zuerst „Größe / Tiefe anwenden“ wählen.");
}
$("save-info").addEventListener(
  "click",
  guard(() => {
    ensureAppliedSize();
    const name = iconFilename($("name").value);
    const stack = Number($("stack-size").value);
    if (!Number.isInteger(stack) || stack < 1 || stack > 0x7fffffff)
      throw appError(
        "StackSize muss ein positiver Integer bis 2147483647 sein.",
      );
    if (stack !== state.icon.stackSize)
      throw appError("Bitte die StackSize-Eingabe zuerst abschließen.");
    download(
      new Blob([AmigaIcon.write(state.icon)], {
        type: "application/octet-stream",
      }),
      name,
    );
    message(
      t("{name} erstellt · {width} × {height} · {pens} Pens · userData 0.", {
        name,
        width: state.icon.width,
        height: state.icon.height,
        pens: 2 ** state.icon.depth,
      }),
    );
  }),
);
$("open-info").addEventListener("click", () => $("info-input").click());
async function openInfo(file) {
  if (file.size > 32 * 1024 * 1024)
    throw appError(".info-Datei ist zu groß (maximal 32 MiB).");
  ensureAppliedSize();
  const expected = revision,
    icon = await importIcon(await file.arrayBuffer(), {
      depth: state.icon.depth,
      palette: state.palette,
      alpha: Number($("alpha").value),
    });
  if (revision !== expected)
    throw appError(
      "Import abgebrochen: Der Editor wurde inzwischen geändert. Bitte erneut öffnen.",
    );
  const hadSelected = !!icon.selected;
  if (!icon.selected) icon.selected = structuredClone(icon.normal);
  const zeroStack = icon.stackSize === 0;
  if (zeroStack) icon.stackSize = 4096;
  resizeIcon(icon, icon.width, icon.height, icon.depth);
  mutate(
    () => {
      sizeDraft = null;
      state.icon = icon;
      state.name = file.name.replace(/\.info$/i, "");
    },
    [
      t("{name} geladen.", { name: file.name }),
      hadSelected ? "" : t("Kein Selected vorhanden; Export deaktiviert."),
      zeroStack
        ? t("StackSize 0 wurde auf den klassischen Standard 4096 gesetzt.")
        : "",
    ]
      .filter(Boolean)
      .join(" "),
  );
}
$("info-input").addEventListener(
  "change",
  guard(async () => {
    const file = $("info-input").files[0];
    $("info-input").value = "";
    if (file) await openInfo(file);
  }),
);
for (const button of document.querySelectorAll("[data-import]"))
  button.addEventListener("click", () => {
    pngTarget = button.dataset.import;
    $("png-input").click();
  });
async function loadPNG(file, key) {
  ensureAppliedSize();
  const threshold = Number($("alpha").value);
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 255)
    throw appError("Alpha-Schwellenwert muss zwischen 0 und 255 liegen.");
  const expected = revision,
    icon = state.icon;
  const pixels = await importPNG(
    file,
    icon.width,
    icon.height,
    state.palette.slice(0, 2 ** icon.depth),
    $("import-mode").value,
    threshold,
  );
  if (revision !== expected)
    throw appError(
      "PNG-Import abgebrochen: Der Editor wurde inzwischen geändert. Bitte erneut importieren.",
    );
  mutate(
    () => {
      state.icon[key].pixels = pixels;
      if (key === "selected") state.icon.selectedEnabled = true;
    },
    t("PNG lokal auf {width} × {height} und {pens} Pens reduziert.", {
      width: icon.width,
      height: icon.height,
      pens: 2 ** icon.depth,
    }),
  );
  setActive(key);
}
$("png-input").addEventListener(
  "change",
  guard(async () => {
    const file = $("png-input").files[0];
    $("png-input").value = "";
    if (file) await loadPNG(file, pngTarget);
  }),
);
for (const button of document.querySelectorAll("[data-png]"))
  button.addEventListener(
    "click",
    guard(async () => {
      const key = button.dataset.png,
        name = iconFilename(state.name).replace(/\.info$/, "");
      const blob = await new Promise((resolve) =>
        pixelsToCanvas(state.icon[key], state.palette).toBlob(
          resolve,
          "image/png",
        ),
      );
      if (!blob) throw appError("PNG konnte nicht erzeugt werden.");
      download(blob, `${name}-${key}.png`);
      message(t("PNG mit aktueller Vorschaufarbpalette gespeichert."));
    }),
  );
document.addEventListener("dragover", (e) => {
  e.preventDefault();
});
for (const key of ["normal", "selected"]) {
  const panel = $(`${key}-panel`);
  panel.addEventListener("dragover", () => panel.classList.add("drag-over"));
  panel.addEventListener("dragleave", () =>
    panel.classList.remove("drag-over"),
  );
}
document.addEventListener(
  "drop",
  guard(async (e) => {
    e.preventDefault();
    for (const p of document.querySelectorAll(".drag-over"))
      p.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (/\.info$/i.test(file.name)) await openInfo(file);
    else {
      const key = e.target.closest("#selected-panel") ? "selected" : "normal";
      await loadPNG(file, key);
    }
  }),
);
$("info-link").addEventListener("click", (event) => {
  event.preventDefault();
  $("info-dialog").showModal();
});
$("info-close").addEventListener("click", () => $("info-dialog").close());
render();
