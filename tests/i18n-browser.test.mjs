import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { AmigaIcon } from "../js/amiga-icon.js";
import { colorFixture } from "./modern-fixtures.js";
const { chromium, firefox } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.TEST_URL || "http://127.0.0.1:8080";
for (const [browserName, type] of [
  ["chromium", chromium],
  ["firefox", firefox],
]) {
  const browser = await type.launch({ headless: true });
  try {
    for (const locale of ["de-DE", "de-CH", "en-US", "en-GB", "fr-FR"]) {
      const context = await browser.newContext({
        locale,
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
      await page.locator("#palette button").first().waitFor();
      const de = locale.startsWith("de");
      assert.equal(
        await page.locator("html").getAttribute("lang"),
        de ? "de" : "en",
      );
      assert.equal(
        (await page.locator("#open-info").innerText()).trim(),
        de ? ".info öffnen" : "Open .info",
      );
      assert.equal(
        await page.locator('[data-clear="normal"]').innerText(),
        de ? "Leeren" : "Clear",
      );
      assert.equal(
        await page.locator("#selected-title strong").innerText(),
        de ? "AUSGEWÄHLT" : "SELECTED",
      );
      assert(
        (await page.locator("#undo").innerText()).includes(
          de ? "Rückgängig" : "Undo",
        ),
      );
      assert(
        (
          await page.locator("#normal-canvas").getAttribute("aria-label")
        ).includes(de ? "Pfeiltasten" : "Arrow keys"),
      );
      assert(
        (await page.locator('#type option[value="3"]').textContent()).includes(
          de ? "Programm" : "Tool",
        ),
      );
      // Details, metadata, alt texts, and CSS-generated text use the same language.
      await page.locator("#selected-enabled").uncheck();
      const after = await page
        .locator("#selected-title strong")
        .evaluate((el) => getComputedStyle(el, "::after").content);
      assert(
        after.includes("attr(data-excluded-label)") ||
          after.includes(de ? "nicht exportiert" : "not exported"),
      );
      assert.equal(
        await page
          .locator("#selected-title strong")
          .getAttribute("data-excluded-label"),
        de ? " · nicht exportiert" : " · not exported",
      );
      await page.locator("#selected-enabled").check();
      const metadata = await page.locator("#metadata").textContent();
      assert(metadata.includes(de ? "Farbtiefe:" : "Depth:"));
      await context.setOffline(true);
      await page.locator("#stack-size").fill("0");
      await page.click("#save-info");
      await page
        .locator("#status.error")
        .filter({ hasText: de ? "positive Ganzzahl" : "positive integer" })
        .waitFor();
      await page.locator("#stack-size").fill("16384");
      await page.locator("#stack-size").blur();
      await page
        .locator("#info-input")
        .setInputFiles({
          name: "broken.info",
          mimeType: "application/octet-stream",
          buffer: Buffer.from([0, 0]),
        });
      await page
        .locator("#status.error")
        .filter({
          hasText: de ? "Kennung E310 fehlt" : "magic E310 is missing",
        })
        .waitFor();
      // User text is unchanged even if it matches a translation key.
      await page
        .locator("#info-input")
        .setInputFiles({
          name: "Dateiname.info",
          mimeType: "application/octet-stream",
          buffer: Buffer.from(colorFixture(true)),
        });
      await page
        .locator("#status")
        .filter({
          hasText: de ? "Dateiname.info geladen." : "Dateiname.info loaded.",
        })
        .waitFor();
      assert.equal(await page.locator("#name").inputValue(), "Dateiname");
      assert(
        (await page.locator("#import-note").textContent()).includes(
          de
            ? "Farben/Transparenz wurden reduziert"
            : "Colors/transparency have been reduced",
        ),
      );
      await page
        .locator("#default-tool")
        .evaluate((el) => (el.closest("details").open = true));
      await page.locator("#default-tool").fill("SYS:Tools/Programm");
      await page.locator("#default-tool").blur();
      await page.locator("#tool-types").fill("NAME=Dateiname\nMODE=Selected");
      await page.locator("#tool-types").blur();
      await page.click("#generate");
      await page
        .locator("#status")
        .filter({
          hasText: de
            ? "Ausgewähltes Bild erzeugt"
            : "Selected image generated",
        })
        .waitFor();
      const event = page.waitForEvent("download");
      await page.click("#save-info");
      const downloaded = await event;
      assert.equal(downloaded.suggestedFilename(), "Dateiname.info");
      const data = await readFile(await downloaded.path()),
        icon = AmigaIcon.parse(
          data.buffer.slice(data.byteOffset, data.byteOffset + data.length),
        );
      assert.equal(icon.defaultTool, "SYS:Tools/Programm");
      assert.deepEqual(icon.toolTypes, ["NAME=Dateiname", "MODE=Selected"]);
      assert.equal(icon.userData, 0);
      assert.equal(icon.depth, 2);
      await page.getByRole("link", { name: "Info", exact: true }).click();
      assert.equal(
        await page.locator("#info-text").textContent(),
        "Amiga Workbench 1.x Icon Maker (c)2026 Marcel Jähne",
      );
      await page.keyboard.press("Escape");
      assert.equal(
        await page.locator("#info-dialog").evaluate((d) => d.open),
        false,
      );
      for (const width of [768, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
      }
      assert.deepEqual(errors, []);
      assert.deepEqual(writes, []);
      console.log(
        `${browserName} ${locale}: language, labels, errors, notices, offline export, unchanged metadata, dialog and layout PASS`,
      );
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
