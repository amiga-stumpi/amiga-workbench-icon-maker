import { test, equal, assert, throws } from "./harness.js";
import { messages } from "../js/translations.js";
import { detectLanguage, t, appError, errorMessage } from "../js/i18n.js";
test("Browsersprache: Deutsch, regionale Varianten und Englisch als Fallback", () => {
  for (const value of ["de", "de-DE", "de-AT", "de-CH", "DE_ch"])
    equal(detectLanguage([value]), "de");
  for (const value of ["en", "en-US", "en-GB", "fr-FR", "ja-JP", "", null])
    equal(detectLanguage([value]), "en");
  equal(detectLanguage([]), "en");
  equal(detectLanguage(["fr-FR", "de-DE"]), "en");
  equal(detectLanguage(["en-GB", "de-DE"]), "en");
  equal(detectLanguage(["de-CH", "en-US"]), "de");
});
test("Übersetzungskatalog vollständig mit identischen Platzhaltern", () => {
  const placeholders = (value) =>
    [...new Set(value.match(/\{\w+\}/g) || [])].sort().join(",");
  for (const [key, value] of Object.entries(messages)) {
    assert(value.de?.trim(), `Deutsch fehlt: ${key}`);
    assert(value.en?.trim(), `Englisch fehlt: ${key}`);
    equal(placeholders(value.de), placeholders(value.en));
  }
  throws(() => t("missing key"));
  throws(() => t("Pen {pen} wählen"));
});
test("Interpolation verändert keine Dateinamen oder Nachrichtenwerte", () => {
  equal(
    t("{name} geladen.", { name: "Dateiname {pens}.info" }, "en"),
    "Dateiname {pens}.info loaded.",
  );
  equal(
    t("{name} geladen.", { name: "Dateiname {pens}.info" }, "de"),
    "Dateiname {pens}.info geladen.",
  );
});
test("Fehlertexte bleiben API-stabil und werden in der UI übersetzt", () => {
  const error = appError(
    "Pen {pen} kann bei {depth} Bitplanes nicht gespeichert werden.",
    { pen: 6, depth: 2 },
    RangeError,
  );
  assert(error instanceof RangeError);
  equal(error.message, "Pen 6 kann bei 2 Bitplanes nicht gespeichert werden.");
  equal(
    errorMessage(error, "de"),
    "Pen 6 kann bei 2 Bitebenen nicht gespeichert werden.",
  );
  equal(errorMessage(error, "en"), "Pen 6 cannot be saved with 2 bitplanes.");
  const cause = appError(
    "OS4-ARGB konnte nicht dekomprimiert werden: {detail}",
    { detail: appError("Unvollständige ARGB-Bilddaten.") },
  );
  equal(
    errorMessage(cause, "en"),
    "Could not decompress OS4 ARGB: Incomplete ARGB image data.",
  );
  equal(
    errorMessage(new Error("browser-specific diagnostic"), "de"),
    "Ungültige oder beschädigte Daten.",
  );
});
