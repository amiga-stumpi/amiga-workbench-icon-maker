import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { AmigaIcon } from "../js/amiga-icon.js";
import {
  colorFixture,
  argbFixture,
  envelope,
  newIconTypes,
  pngFixture,
  concat,
} from "./modern-fixtures.js";
const { chromium, firefox } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const png = await pngFixture(),
  selectedPNG = await pngFixture([255, 255, 255, 255]);
const fixtures = [
  ["Color.info", colorFixture(true), "ColorIcon / GlowIcon", [0, 1, 2, 3]],
  [
    "New.info",
    envelope(new Uint8Array(), { toolTypes: newIconTypes() }),
    "NewIcon",
    [0, 1, 2, 3],
  ],
  ["ARGB.info", await argbFixture(true), "OS4 ARGB", [0, 1, 2, 3]],
  ["Single.info", png.buffer, "PNG-Icon", [3]],
  ["Dual.info", concat(png, selectedPNG).buffer, "DualPNG", [3]],
  ["OS2.info", envelope(), "OS2+/OS3 / MagicWB", [0, 0, 0, 0]],
];
for (const [name, type] of [
  ["chromium", chromium],
  ["firefox", firefox],
]) {
  const browser = await type.launch({ headless: true });
  try {
    const context = await browser.newContext({
      locale: "de-DE",
      viewport: { width: 1440, height: 1000 },
      acceptDownloads: true,
    });
    const page = await context.newPage(),
      errors = [],
      uploads = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (r.method() !== "GET") uploads.push(r.url());
    });
    await page.goto(process.env.TEST_URL || "http://127.0.0.1:8080");
    await page.locator("#palette button").first().waitFor();
    await context.setOffline(true);
    for (const [file, bytes, format, expected] of fixtures) {
      await page.locator("#info-input").setInputFiles({
        name: file,
        mimeType: "application/octet-stream",
        buffer: Buffer.from(bytes),
      });
      await page
        .locator("#status")
        .filter({ hasText: `${file} geladen` })
        .waitFor();
      assert(
        (await page.locator("#import-note").textContent()).includes(format),
      );
      // Keep below Chromium's burst-download limit during bulk fixture checks.
      await new Promise((resolve) => setTimeout(resolve, 350));
      const event = page.waitForEvent("download");
      await page.click("#save-info");
      const downloaded = await event;
      const data = await readFile(await downloaded.path()),
        icon = AmigaIcon.parse(
          data.buffer.slice(data.byteOffset, data.byteOffset + data.length),
        );
      assert.deepEqual(Array.from(icon.normal.pixels), expected);
      assert.equal(icon.depth, 2);
      assert.equal(icon.userData, 0);
      if (format === "DualPNG")
        assert.deepEqual(Array.from(icon.selected.pixels), [1]);
      else if (format === "PNG-Icon" || format === "OS4 ARGB")
        assert.equal(icon.selected, null);
      // Modern-derived documents stay editable and have undoable import state.
      await page.click('[data-clear="normal"]');
      await page.click("#undo");
    }
    // Real externally supplied reference assets are read locally, never redistributed.
    let external = 0;
    if (process.env.ICON_REFERENCE) {
      const root = process.env.ICON_REFERENCE + "/test-icons";
      for (const dir of await readdir(root))
        for (const file of await readdir(root + "/" + dir)) {
          if (!file.endsWith(".info")) continue;
          await page.locator("#info-input").setInputFiles({
            name: file,
            mimeType: "application/octet-stream",
            buffer: await readFile(root + "/" + dir + "/" + file),
          });
          await page
            .locator("#status")
            .filter({ hasText: `${file} geladen` })
            .waitFor();
          // Keep below Chromium's burst-download limit during bulk fixture checks.
          await new Promise((resolve) => setTimeout(resolve, 350));
          const event = page.waitForEvent("download");
          await page.click("#save-info");
          const downloaded = await event;
          const data = await readFile(await downloaded.path());
          AmigaIcon.parse(
            data.buffer.slice(data.byteOffset, data.byteOffset + data.length),
          );
          external++;
        }
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(uploads, []);
    console.log(
      `${name}: 6 modern-format offline import/edit/export cases + ${external} external icons PASS`,
    );
  } finally {
    await browser.close();
  }
}
