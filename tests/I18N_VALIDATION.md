# Automatic language selection validation

- **118/118 core tests pass**, including language detection, catalog completeness,
  placeholder consistency, localized errors, and unchanged interpolated values.
- The original full editor integration suite passes in Chromium and Firefox
  with an explicit German browser locale.
- The language integration suite passes in both browsers with `de-DE`, `de-CH`,
  `en-US`, `en-GB`, and `fr-FR`: ten browser/locale combinations.

The preferred browser language selects German for `de` and regional variants,
otherwise English. The page's `lang` attribute, static labels, tooltips, canvas
accessibility labels, icon type descriptions, metadata display, status/error
messages, import notices, and excluded-image indicator use that language.

Browser checks cover invalid StackSize and invalid file errors, modern icon
conversion notices, editing and offline .info export. Filenames, DefaultTool,
ToolTypes and pixel data retain their original values. The requested copyright
text in the Info dialog remains exact. Tablet/mobile widths have no horizontal
page overflow. No upload requests or JavaScript runtime errors were observed.

All initial visible text nodes were checked against the translation catalog;
only shared product names, Amiga identifiers, units and symbols remain outside
it. Language selection and translations require no external resources.

```sh
npm test
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/i18n-browser.test.mjs
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/browser.test.mjs
```

Verified with Chromium 134 and Firefox 135 via Playwright 1.51.1. Stable tags
`v1.0.0` and `stable` remain on the previously marked release.
