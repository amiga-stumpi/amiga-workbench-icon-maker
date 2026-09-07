# Modern icon import validation

The expanded suite passes **114/114 tests**, including the original classic
binary tests. Modern-format fixtures are synthetic and contain no external icon
artwork. The classic writer and its original sample files remain unchanged.

Verified with Chromium 134 and Firefox 135 via Playwright 1.51.1:

- All original editor integration tests, including browser unit tests.
- Six synthetic format cases: compressed ColorIcon, NewIcon, OS4 ARGB,
  PNG, DualPNG, and planar OS2 icon. Each imports offline, remains editable,
  and downloads a readable classic DiskObject with userData 0.
- All 21 external files in the MIT reference converter's `test-icons` directory
  import through the UI and export as readable classic icons in both browsers.
- No upload requests or JavaScript runtime errors were observed.

Independent comparison against Amiga-Icon-converter revision
`8718bdb1a0b7be42c5ea1d1ca0cfb7f05065f5dc`: **15 modern icons** match the reference
RGB values before palette reduction, with matching alpha for OS4 ARGB images.
The remaining reference files are planar/classic icons covered by the UI tests.
External artwork is not copied into this repository.

Regression coverage includes bit-aligned literal/repeat/NOP RLE packets,
shared Selected palettes, multi-line NewIcon palettes, NewIcon zero runs,
ARGB length and length-minus-one variants, bounded decompression, missing or
truncated IFF chunks, PNG/DualPNG boundaries and CRC validation. The original
four samples also still match the independent classic reference parser.

Commands (with optional external tools/checkouts):

```sh
npm test
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/browser.test.mjs
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs \
  ICON_REFERENCE=/path/to/Amiga-Icon-converter node tests/modern-browser.test.mjs
node scripts/verify-modern-reference.mjs /path/to/Amiga-Icon-converter
```

Modern files are imported with palette/alpha reduction; modern export and PNG
icOn metadata preservation are not implemented. Both limitations are stated in
the UI and README. Real Amiga/WinUAE validation remains outstanding.
