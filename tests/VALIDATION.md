# Validation record — 2026-09-07

Environment: Ubuntu 24.04, Node.js 18.19.1 (development/tests only), nginx
1.24.0 / Ubuntu package 1.24.0-2ubuntu7.17. Browser harness: Playwright 1.51.1,
Chromium 134.0.6998.35 and Firefox 135.0.

- `npm test`: **101/101 pass**.
- `tests/test-runner.html`: **101/101 pass in both browsers**.
- `tests/browser.test.mjs`: **pass in Chromium and Firefox**.
- `scripts/verify-reference.mjs`: **all four samples match the independent
  upstream parser pixel-for-pixel and in key metadata**. An icon from the
  unmodified upstream writer is also decoded correctly by this implementation.
- `git diff --check`: pass.
- `nginx -t`: pass; user service active, enabled, Linger enabled.
- HTTP: application and JS 200; hidden Git files 403; POST 403. LAN address
  `http://192.168.25.60:8080/` returns 200 from the server.

Browser workflow covers local PNG conversion, alpha, drawing, continuous pencil
stroke, separate Selected editing, automatic Selected generation, undo/redo,
Wetter.info filename normalization, binary download and exact reopen, explicit
Selected disabling, flood fill, eyedropper, eraser, Clear/Undo, PNG fit/crop/
original modes, PNG export, unsupported formats, DrawerData export guard,
non-aligned resize, pending dimension guard, invalid StackSize guard, 3-plane
export with Pen 7, rejected lossy depth reduction, and PNG/.info drag and drop.
The processing workflow runs with browser networking disabled. No non-GET
requests or JavaScript runtime errors were observed. Desktop 1440px, tablet
768px and mobile 390px layouts passed overflow checks; desktop screenshots
were visually reviewed. Screenshots are generated into ignored `test-results/`.

Binary audit covers m68k two-byte struct alignment, big endian integers, signed
coordinates and unsigned NO_ICON_POSITION, 16-pixel row padding, depth, mapping
of PlanePick and PlaneOnOff, image presence/offsets, exact allocation sizes,
truncation at every byte boundary, and text payload bounds/termination.

Sample sizes:

| File | Bytes |
| --- | ---: |
| Test.info | 886 |
| wb13-tool-48x32-4colors.info | 886 |
| wb13-project-48x32-4colors.info | 886 |
| wb13-padding-test-47x31.info | 862 |

**Binärtests erfolgreich, echter WinUAE-/Amiga-Test noch ausstehend.**
No claim of physical Amiga, Kickstart 1.3, Workbench 1.3 or WinUAE execution is
made. Edge and newer browser releases were not separately run. See README
for the remaining Workbench acceptance procedure and supported format limits.
