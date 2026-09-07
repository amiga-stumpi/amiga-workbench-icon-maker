import { messages } from "./translations.js";

export function detectLanguage(languages = []) {
  // The browser's first preference is authoritative; regional tags (de-AT,
  // de-CH, en-GB, …) share their base language. Unsupported languages use English.
  const preferred = Array.isArray(languages) ? languages[0] : languages;
  return typeof preferred === "string" && /^de(?:[-_]|$)/i.test(preferred)
    ? "de"
    : "en";
}
export const language = detectLanguage(
  globalThis.navigator?.languages?.length
    ? globalThis.navigator.languages
    : [globalThis.navigator?.language],
);
function interpolate(template, params, renderValue = String) {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    if (!(key in params))
      throw new Error(`Missing translation parameter: ${key}`);
    return renderValue(params[key]);
  });
}
export function t(key, params = {}, locale = language) {
  const entry = messages[key];
  if (!entry) throw new Error(`Missing translation: ${key}`);
  return interpolate(entry[locale === "de" ? "de" : "en"], params, (value) =>
    value instanceof Error ? errorMessage(value, locale) : String(value),
  );
}
// Keep diagnostics independent of navigator, while carrying the original
// message key and values to the UI. Never translate interpolated user data.
export function appError(key, params = {}, ErrorClass = Error) {
  const error = new ErrorClass(
    interpolate(key, params, (value) =>
      value instanceof Error ? value.message : String(value),
    ),
  );
  error.messageKey = key;
  error.messageParams = params;
  return error;
}
export function errorMessage(error, locale = language) {
  if (error?.messageKey && messages[error.messageKey])
    return t(error.messageKey, error.messageParams, locale);
  return t("Ungültige oder beschädigte Daten.", {}, locale);
}
export function localizePage(root = document) {
  root.documentElement.lang = language;
  // Only initial static markup is visited, before the editor is populated.
  // Input values, filenames, ToolTypes, and later imported content are untouched.
  const walker = root.createTreeWalker(root.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.parentElement.closest("script, style, noscript")) continue;
    const normalized = node.textContent.replace(/\s+/g, " ").trim();
    if (messages[normalized]) {
      node.textContent = node.textContent.replace(
        /\S[\s\S]*\S|\S/,
        t(normalized),
      );
    }
  }
  for (const element of root.querySelectorAll(
    '[aria-label], [title], [placeholder], meta[name="description"]',
  )) {
    for (const attr of ["aria-label", "title", "placeholder", "content"]) {
      const value = element.getAttribute(attr);
      if (value && messages[value]) element.setAttribute(attr, t(value));
    }
  }
  root.querySelector("#selected-title strong").dataset.excludedLabel = t(
    " · nicht exportiert",
  );
}
