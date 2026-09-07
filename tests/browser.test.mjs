// Optional integration test: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/browser.test.mjs
import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { AmigaIcon } from "../js/amiga-icon.js";
const { chromium, firefox } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.TEST_URL || "http://127.0.0.1:8080";
await mkdir(new URL("../test-results/", import.meta.url), { recursive: true });
for (const [browserName, type] of [
  ["chromium", chromium],
  ["firefox", firefox],
]) {
  const browser = await type.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1100 },
      acceptDownloads: true,
    });
    const page = await context.newPage(),
      errors = [],
      writes = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (r.method() !== "GET") writes.push(r.url());
    });
    await page.goto(base);
    await page.waitForSelector("#palette button");
    assert.equal(await page.locator("#palette button").count(), 4);
    await page.click("#preset");
    // Create an exact RGBA source PNG, including a transparent first pixel.
    const png = Buffer.from(
      await page.evaluate(() => {
        const c = document.createElement("canvas");
        c.width = 48;
        c.height = 32;
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#ff8800";
        ctx.fillRect(0, 0, 48, 32);
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, 24, 32);
        ctx.clearRect(0, 0, 1, 1);
        return c.toDataURL("image/png").split(",")[1];
      }),
      "base64",
    );
    await context.setOffline(true);
    await page
      .locator("#png-input")
      .setInputFiles({ name: "local.png", mimeType: "image/png", buffer: png });
    await page.locator("#status").filter({ hasText: "PNG lokal" }).waitFor();
    await page.click("#generate");
    const normal = await page.locator("#normal-canvas").boundingBox();
    await page.mouse.move(normal.x + 12, normal.y + 12);
    await page.mouse.down();
    await page.mouse.move(normal.x + 100, normal.y + 12, { steps: 2 });
    await page.mouse.up();
    const selected = await page.locator("#selected-canvas").boundingBox();
    await page.mouse.click(selected.x + 12, selected.y + 12);
    await page.locator("#name").fill("Wetter.info");
    await page.locator("#name").blur();
    async function exportInfo() {
      const event = page.waitForEvent("download");
      await page.click("#save-info");
      const dl = await event;
      const buffer = await readFile(await dl.path());
      return {
        name: dl.suggestedFilename(),
        icon: AmigaIcon.parse(
          buffer.buffer.slice(
            buffer.byteOffset,
            buffer.byteOffset + buffer.byteLength,
          ),
        ),
        buffer,
      };
    }
    let exported = await exportInfo();
    assert.equal(exported.name, "Wetter.info");
    assert.equal(exported.icon.normal.pixels[0], 0);
    assert.equal(exported.icon.normal.pixels[30], 3);
    assert.equal(exported.icon.selected.pixels[2], 2);
    assert.equal(exported.icon.selected.pixels[49], 1);
    assert.equal(exported.icon.type, 3);
    assert.equal(exported.icon.stackSize, 16384);
    assert.equal(exported.icon.userData, 0);
    assert.equal(exported.icon.currentX, 0x80000000);
    assert.equal(exported.icon.currentY, 0x80000000);
    for (let x = 1; x <= 12; x++)
      assert.equal(exported.icon.normal.pixels[48 + x], 1);
    await page.click("#undo");
    let undone = await exportInfo();
    assert.equal(undone.name, "MyProgram.info");
    await page.click("#undo");
    undone = await exportInfo();
    assert.equal(undone.icon.selected.pixels[49], 2);
    await page.click("#redo");
    await page.click("#redo");
    // Save/open roundtrip works even with the browser network disabled.
    await page.locator("#info-input").setInputFiles({
      name: "Wetter.info",
      mimeType: "application/octet-stream",
      buffer: exported.buffer,
    });
    await page
      .locator("#status")
      .filter({ hasText: "Wetter.info geladen" })
      .waitFor();
    const reopened = await exportInfo();
    assert.deepEqual(reopened.buffer, exported.buffer);
    await page.locator("#selected-enabled").uncheck();
    exported = await exportInfo();
    assert.equal(exported.icon.selected, null);
    await page.locator("#selected-enabled").check();
    // Tools: fill, picker, erase, clear and undo.
    await page.click('[data-tool="fill"]');
    await page.click('[aria-label="Pen 2 wählen"]');
    await page.mouse.click(normal.x + 244, normal.y + 84);
    exported = await exportInfo();
    assert.equal(exported.icon.normal.pixels[10 * 48 + 30], 2);
    await page.click('[data-tool="picker"]');
    await page.mouse.click(normal.x + 244, normal.y + 84);
    assert.equal(
      await page
        .locator('[aria-label="Pen 2 wählen"]')
        .getAttribute("aria-pressed"),
      "true",
    );
    await page.click('[data-tool="eraser"]');
    await page.mouse.click(normal.x + 244, normal.y + 84);
    exported = await exportInfo();
    assert.equal(exported.icon.normal.pixels[10 * 48 + 30], 0);
    await page.click('[data-clear="normal"]');
    exported = await exportInfo();
    assert(exported.icon.normal.pixels.every((p) => p === 0));
    await page.click("#undo");
    // PNG modes, dimensions and alpha are tested through the real decoder/canvas.
    const imports = await page.evaluate(async (b64) => {
      const { importPNG } = await import("./js/image-import.js");
      const { WB13_PALETTE } = await import("./js/palette.js");
      const bytes = Uint8Array.from(atob(b64), (x) => x.charCodeAt(0));
      const file = new File([bytes], "test.png", { type: "image/png" });
      const result = {};
      for (const mode of ["fit", "crop", "original"])
        result[mode] = Array.from(
          await importPNG(file, 48, 48, WB13_PALETTE, mode),
        );
      return result;
    }, png.toString("base64"));
    assert.equal(imports.fit[0], 0);
    assert.equal(imports.fit[8 * 48 + 30], 3);
    assert.equal(imports.original[40 * 48 + 30], 0);
    assert.equal(imports.crop[40 * 48 + 30], 3);
    // Unsupported files show inline errors and retain the document.
    await page.locator("#info-input").setInputFiles({
      name: "invalid.info",
      mimeType: "application/octet-stream",
      buffer: Buffer.from([0, 0, 0, 0]),
    });
    await page.locator("#status").filter({ hasText: "Magic" }).waitFor();
    assert.equal(await page.locator("#name").inputValue(), "Wetter");
    await page.locator("#type").selectOption("2");
    await page.click("#save-info");
    await page.locator("#status").filter({ hasText: "DrawerData" }).waitFor();
    await page.locator("#type").selectOption("3");
    await page.locator("#width").fill("47");
    await page.locator("#height").fill("31");
    await page.click("#apply-size");
    exported = await exportInfo();
    assert.equal(exported.icon.width, 47);
    assert.equal(exported.icon.height, 31);
    // Invalid stack must block export without silently reverting to the old value.
    await page.locator("#stack-size").fill("0");
    await page.click("#save-info");
    await page
      .locator("#status.error")
      .filter({ hasText: "StackSize" })
      .waitFor();
    assert.equal(await page.locator("#stack-size").inputValue(), "0");
    await page.locator("#stack-size").fill("16384");
    await page.locator("#stack-size").blur();
    // Pending dimensions survive unrelated edits and must be explicitly applied.
    await page.locator("#width").fill("49");
    await page.click("#copy-to-selected");
    assert.equal(await page.locator("#width").inputValue(), "49");
    await page.click("#save-info");
    await page
      .locator("#status.error")
      .filter({ hasText: "anwenden" })
      .waitFor();
    await page.locator("#depth").selectOption("3");
    await page.click("#apply-size");
    assert.equal(await page.locator("#palette button").count(), 8);
    await page.click('[data-tool="pencil"]');
    await page.click('[aria-label="Pen 7 wählen"]');
    await page.locator("#normal-canvas").focus();
    await page.keyboard.press("Enter");
    exported = await exportInfo();
    assert.equal(exported.icon.width, 49);
    assert.equal(exported.icon.depth, 3);
    assert(exported.icon.normal.pixels.includes(7));
    await page.locator("#depth").selectOption("2");
    await page.click("#apply-size");
    await page.locator("#status.error").filter({ hasText: "Pen 7" }).waitFor();
    await page.locator("#depth").selectOption("3");
    await page.click("#apply-size");
    // Native download of a PNG.
    const pngEvent = page.waitForEvent("download");
    await page.click('[data-png="normal"]');
    assert.equal((await pngEvent).suggestedFilename(), "Wetter-normal.png");
    // Drag-and-drop PNG into Selected, then a classic .info onto the application.
    await page.evaluate((b64) => {
      const dt = new DataTransfer();
      dt.items.add(
        new File(
          [Uint8Array.from(atob(b64), (x) => x.charCodeAt(0))],
          "selected.png",
          { type: "image/png" },
        ),
      );
      document.querySelector("#selected-panel").dispatchEvent(
        new DragEvent("drop", {
          bubbles: true,
          cancelable: true,
          dataTransfer: dt,
        }),
      );
    }, png.toString("base64"));
    await page.locator("#status").filter({ hasText: "PNG lokal" }).waitFor();
    assert.equal(await page.locator("#selected-enabled").isChecked(), true);
    await page.evaluate((b64) => {
      const dt = new DataTransfer();
      dt.items.add(
        new File(
          [Uint8Array.from(atob(b64), (x) => x.charCodeAt(0))],
          "Dropped.info",
          { type: "application/octet-stream" },
        ),
      );
      document.body.dispatchEvent(
        new DragEvent("drop", {
          bubbles: true,
          cancelable: true,
          dataTransfer: dt,
        }),
      );
    }, exported.buffer.toString("base64"));
    await page
      .locator("#status")
      .filter({ hasText: "Dropped.info geladen" })
      .waitFor();
    await page.click("#preset");
    await page.screenshot({
      path: new URL(
        `../test-results/${browserName}-desktop.png`,
        import.meta.url,
      ).pathname,
      fullPage: true,
    });
    await page.setViewportSize({ width: 768, height: 1024 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    );
    await page.screenshot({
      path: new URL(
        `../test-results/${browserName}-tablet.png`,
        import.meta.url,
      ).pathname,
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    );
    await context.setOffline(false);
    await page.goto(base + "/tests/test-runner.html");
    await page.locator("body[data-failed]").waitFor();
    assert.equal(await page.locator("body").getAttribute("data-failed"), "0");
    assert.deepEqual(errors, []);
    assert.deepEqual(writes, []);
    console.log(
      `${browserName}: offline PNG → edit → Wetter.info → reopen, tools, errors, PNG modes/export, responsive and browser unit tests PASS`,
    );
  } finally {
    await browser.close();
  }
}
