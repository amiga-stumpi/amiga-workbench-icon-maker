# Amiga Workbench 1.x Icon Maker

Ein statischer HTML/CSS/Vanilla-JavaScript-Editor für klassische Amiga-`.info`-Dateien.
Alle Pixel, PNGs und Binärdaten bleiben im Browser. Keine Uploads, Datenbank,
Backend-API, CDN-Ressourcen oder Laufzeitabhängigkeit von Node.js.

## Start

Den Projektordner auf einen statischen HTTP-Webserver kopieren und `index.html`
aufrufen. Es gibt keinen Build-Schritt. Die JavaScript-Module brauchen HTTP(S);
direktes Öffnen über `file://` wird nicht unterstützt.

Für einen lokalen Entwicklungstest im Projektverzeichnis beispielsweise:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Anschließend **http://localhost:8080/** im Browser öffnen. Python ist hierbei
nur ein optionaler statischer Entwicklungsserver und verarbeitet keine Icons.
Alternativ kann jeder andere statische Webserver verwendet werden.

Sobald die Seite geladen ist, funktionieren Zeichnen, lokale Dateiimporte und
Downloads auch ohne Netzwerk. Ein erneutes Laden der Seite benötigt den
Webserver: Es gibt bewusst keinen Service Worker/Offline-Installationscache.
Der Arbeitsstand liegt im RAM; vor Schließen oder Neuladen als `.info` sichern.

## PNG → .info

1. **Workbench 1.3 Tool Icon** anklicken. Das legt ein leeres 48 × 32 Icon mit
   2 Bitplanes / 4 Pens, Typ WBTOOL, StackSize 16384 und automatischer Position an.
2. Bei Normal **PNG laden** wählen oder eine PNG-Datei auf den Editor ziehen.
3. Standardmodus **Einpassen**: Seitenverhältnis bleibt erhalten, freie Ränder
   erhalten Pen 0. **Zuschneiden** skaliert bildfüllend und beschneidet zentriert.
   **Originalgröße** übernimmt Pixel ohne Skalierung links oben; Überstand wird
   abgeschnitten. Die Icon-Größe ändert sich bei keinem Importmodus.
4. RGB-Farben werden mittels kleinster quadratischer RGB-Distanz den aktiven Pens
   zugeordnet. Alpha unter 128 wird standardmäßig Pen 0. Schwelle ist einstellbar.
   Pixel mit Alpha ab der Schwelle werden anhand ihres RGB-Wertes quantisiert.
   Keine Glättung und kein Dithering.
5. Selected erzeugen: Normal kopieren, Pen 1/2 tauschen, Pen 1/3 tauschen oder Pens
   invertieren. Beide Bilder anschließend getrennt bearbeiten.
6. Name `Wetter` eingeben und **.info speichern** klicken: Download `Wetter.info`.
   Eine bereits eingegebene `.info`-Endung wird nicht doppelt angehängt.

PNG ist auf 32 MiB / 16 Megapixel begrenzt. Die Icon-Fläche darf 1–256 Pixel je
Achse haben. Dateinamen verwenden maximal 25 Latin-1-Zeichen vor `.info`, damit
die klassische Amiga-Grenze von 30 Bytes inklusive Endung eingehalten wird.
Eine `Wetter.info` ist das Icon für eine gleichnamige Datei `Wetter`; sie enthält
selbst kein ausführbares Programm.

## .info → Editor

**.info öffnen** oder eine `.info` auf die Anwendung ziehen. Magic, Version,
Dateigrenzen, Images und Metadaten werden geprüft, die Bitplanes dekodiert und
die Zustände angezeigt. Fehler erscheinen in der Statuszeile; der bisherige
Arbeitsstand bleibt bei fehlgeschlagenem Import erhalten. Das Laden ist mit Undo
rückgängig zu machen. Dateien sind auf 32 MiB begrenzt.

Auch **NewIcons, ColorIcons/GlowIcons, OS4-ARGB und PNG-/DualPNG-Icons**
lassen sich über denselben Dialog oder per Drag & Drop öffnen. Die modernen
Bilddaten werden mit ihrem Alphakanal dekodiert und auf die aktuell gewählte
Palette und Farbtiefe reduziert (standardmäßig 4 Workbench-Pens). Normal und
Selected bleiben getrennt. Ein dauerhafter Hinweis nennt das Quellformat und
die Konvertierung; der Download bleibt ein **klassisches WB1.x-.info**.

Die Quellgröße wird bis 256 × 256 Pixel übernommen. Größere PNG-Icons werden
proportional eingepasst; bei unterschiedlich großen Zuständen wird die kleinere
Fläche rechts/unten mit Pen 0 aufgefüllt. Der PNG-Importmodus für einzelne
Editorbilder gilt nicht für diesen `.info`-Import.

DiskObject-Metadaten wie Typ, DefaultTool und reguläre ToolTypes werden soweit
unterstützt übernommen. NewIcon-Bilddaten in ToolTypes werden entfernt.
PNG-`icOn`-Metadaten werden derzeit nicht übernommen: Ein Hinweis fordert zur
Prüfung von Icon Type und Startparametern auf. Für PNG-Icons gelten zunächst
WBTOOL, StackSize 16384 und automatische Position. Ein modernes Icon wird nicht
verlustfrei in seinem Quellformat gespeichert.

Ein fehlendes Selected wird als bearbeitbare Normal-Kopie angezeigt, aber sein
Export bleibt ausdrücklich deaktiviert. Ohne Selected exportiert der Writer
den klassischen Complement-Highlight-Modus. StackSize 0 in einer klassischen Altdatei wird
im UI mit Hinweis auf 4096 gesetzt; der Writer verlangt positive Werte.

Image-Abmessungen und positive Versätze innerhalb der Gadget-Fläche werden beim
Öffnen im UI auf diese Fläche mit Pen 0 erweitert. Der Parser/Writer kann die
unterschiedlichen Image-Größen auch unmittelbar erhalten. Unterstützte
PlanePick-/PlaneOnOff-Zuordnungen werden auf gleichwertige, fortlaufende
Pen-Bitplanes normalisiert. Daher muss ein bearbeiteter Export nicht bytegleich
zum Original sein; die unterstützten Bildinhalte bleiben erhalten.

## Bedienung

- Stift mit durchgehenden Linien bei schnellem Ziehen, Radierer (Pen 0), Pipette,
  zusammenhängende Flächenfüllung, Clear.
- Normal und Selected mit eigenen Pixelarrays; Kopieren in beide Richtungen.
- Gemeinsame History mit 60 Undo-Schritten, inklusive Bildimport, Größenänderung,
  Preset und Metadaten. Strg/Cmd+Z, Strg/Cmd+Umschalt+Z, Strg/Cmd+Y.
- Zoom 4×–16×, Raster ein/aus, Vorschau in Originalgröße. Bei kleinen Displays
  stehen die Editoren untereinander; große Canvas-Flächen scrollen intern.
- Canvas per Tab fokussieren, Pfeiltasten bewegen die Pixelposition,
  Leertaste/Enter wendet das Werkzeug an. Pointer Events unterstützen Touch.
- Spiegeln, Schieben ohne Wrap (neue Fläche Pen 0), beliebige Pens tauschen.
- PNG-Export beider Zustände mit aktueller Palette; alle PNG-Exportpixel sind
  deckend. Eine klassische `.info` hat keinen separaten Alphakanal.
- Vorschaufarben pro Pen veränderbar, Workbench-Palette jederzeit zurücksetzbar.

## Amiga-Begriffe und Standardwerte

**WBTOOL** (3) bezeichnet ein ausführbares Programm. WBPROJECT (4) bezeichnet
Daten für ein Programm, das über **DefaultTool** angegeben werden kann.
Weitere Typen: WBDISK (1), WBDRAWER (2), WBGARBAGE (5), WBDEVICE (6), WBKICK (7).

**StackSize** ist die Stack-Größe in Bytes für den Programmstart durch Workbench.
Standard hier: 16384, zulässig: positive ganze Zahlen bis 2147483647.

**NO_ICON_POSITION** ist `0x80000000` (unsigned 2147483648, signed −2147483648).
Es weist Workbench an, die Position automatisch zu wählen. Standardmäßig steht
dieser Wert sowohl in CurrentX als auch in CurrentY. Bei manueller Position
werden signed 32-Bit-Koordinaten als unveränderte Big-Endian-Bitmuster gespeichert.

Standardpalette (nur Vorschau/PNG, **nicht in .info gespeichert**):

| Pen | RGB           | Hex     |
| --- | ------------- | ------- |
| 0   | 85, 170, 255  | #55AAFF |
| 1   | 255, 255, 255 | #FFFFFF |
| 2   | 0, 0, 0       | #000000 |
| 3   | 255, 136, 0   | #FF8800 |

Die Farben auf dem Amiga richten sich nach dessen Bildschirm-Pens.
Die Vorschaufarben 4–7 sind eine frei wählbare Erweiterung, kein WB1.3-Standard.

## Formate und Grenzen

Fokus: **OldIcon / Classic DiskObject Version 1, userData 0**, geeignetes Ziel
Kickstart 1.3 / Workbench 1.3. Der Writer setzt stets userData 0, Gadget-Flags 6
(mit Selected) bzw. 4 (ohne), Activation 3, GadgetType 1 und unbenutzte
Gadget-Felder auf 0. Pointerfelder in der Datei sind Anwesenheitsmarker; die
Datenblöcke folgen sequentiell.

1, 2 und 3 Bitplanes werden gelesen und geschrieben. **2 Bitplanes / 4 Pens sind
der Workbench-1.3-Kompatibilitätsmodus.** 1/3 Bitplanes sind Zusatzmodi des
Binärformats; insbesondere 8 Pens benötigen einen passenden Bildschirm und
sind nicht als Standard-WB1.3-Darstellung validiert. Die Amiga-Icon-Dokumentation
empfiehlt für Workbench-Images Depth 2, PlanePick 3 und PlaneOnOff 0.

Unterstützter Import:

| Format                          | Verarbeitung                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------- |
| Klassische WB1.x-OldIcons       | Pen-Indizes und unterstützte Metadaten erhalten                                  |
| Planare OS2+/OS3-/MagicWB-Icons | Bis 8 Pens, Quellfarben anhand einer üblichen OS2+/MagicWB-Palette interpretiert |
| NewIcons                        | IM1=/IM2=-ToolTypes, mehrzeilige Paletten, 7-Bit-Kodierung und Zero-RLE          |
| ColorIcons / GlowIcons          | FORM ICON, FACE/IMAG, unkomprimierte oder RLE-komprimierte Bilder und Paletten   |
| OS4 TrueColor / ARGB            | FORM ICON mit ARGB-Chunks, zlib und Alphakanal                                   |
| PNG / DualPNG                   | Ein oder zwei vollständige PNG-Bilder, Chunk-Grenzen und CRC geprüft             |

Nicht unterstützt: Export in modernen Formaten, PNG-`icOn`-Metadaten,
Border-Gadgets, verkettete Images, rein planare Icons mit mehr als 8 Pens ohne
eingebettete Palette, unbekannte Kompressionsarten und unbekannte Dateianhänge
außerhalb gültiger IFF-Chunks. Solche Daten führen zu einer Fehlermeldung statt
einer stillen Übernahme des klassischen Ersatzbildes.

**DrawerData:** WBDISK, WBDRAWER und WBGARBAGE benötigen laut Amiga-Dokumentation
DrawerData. Diese Typen sind auswählbar, Export ohne DrawerData ist gesperrt.
Aus einer klassischen Vorlage gelesene 56-Byte-DrawerData bleiben erhalten.
Neue DrawerData erzeugen oder deren Fensterparameter bearbeiten ist noch nicht
implementiert. Beim Import moderner DiskObjects werden die 56 klassischen
DrawerData-Bytes erhalten; die zusätzlichen sechs OS2+-Bytes werden gelesen,
aber mit Hinweis nicht in den WB1.x-Export übernommen.

DefaultTool und ToolTypes sind bereits im UI und Binärkern implementiert:
Latin-1, keine eingebetteten Nullzeichen, maximal 4095 Zeichen pro Text und
1024 ToolTypes. Für bestmögliche Amiga-Kompatibilität ToolTypes kurz halten
(die Amiga-Dokumentation empfiehlt höchstens 128 Bytes). ToolWindow wird vom
Parser/Writer erhalten, hat jedoch kein eigenes Bearbeitungsfeld.

Noch offen: echte WinUAE-/Amiga-Abnahme, DrawerData-Erzeugung/Editor,
Clipboard-Import, Dithering und dauerhafte Browser-Projektspeicherung.
Export in modernen Formaten und die Übernahme von PNG-Icon-Metadaten sind ebenfalls noch offen.

## Binärkern-API

```javascript
import { AmigaIcon } from "./js/amiga-icon.js";

const icon = AmigaIcon.create({
  width: 48,
  height: 32,
  depth: 2,
  type: AmigaIcon.WBTOOL,
  stackSize: 16384,
  currentX: AmigaIcon.NO_ICON_POSITION,
  currentY: AmigaIcon.NO_ICON_POSITION,
  normalPixels: new Uint8Array(48 * 32),
  selectedPixels: new Uint8Array(48 * 32),
});
const buffer = AmigaIcon.write(icon);
const restored = AmigaIcon.parse(buffer);
// restored.normal.pixels / restored.selected.pixels: flache Pen-Arrays
```

Der klassische synchrone Parser bleibt bewusst auf OldIcons beschränkt.
Für den erweiterten Browserimport gibt es eine separate asynchrone API:

```javascript
import { importIcon } from "./js/icon-import.js";
import { defaultPalette } from "./js/palette.js";

const icon = await importIcon(arrayBuffer, {
  depth: 2,
  palette: defaultPalette(),
  alpha: 128,
});
// icon.sourceFormat / icon.importNotice beschreiben eine erfolgte Konvertierung.
const classicBuffer = AmigaIcon.write(icon);
```

ARGB nutzt die browserseitige `DecompressionStream`-API, PNG den nativen
Bilddecoder. Zusätzliche Bibliotheken oder Netzwerkzugriffe sind nicht nötig.

`selectedPixels: null` beim Erzeugen oder `selectedEnabled = false` deaktiviert
den Selected-Export. `BinaryStream` arbeitet ausschließlich Big Endian;
`readDWord()` ist unsigned, `readLong()` signed. `readBits(count, bitPosition,
position)` liest MSB-first ohne den Bytecursor zu ändern; `writeBits(bits)`
schreibt ein Bitarray und füllt dessen letztes Byte mit Nullbits auf.
`goto()` darf exakt EOF erreichen; jeder Zugriff darüber hinaus wirft einen Fehler.

## Tests und Samples

Ohne zusätzliche Pakete, mit Node.js 18+ als reinem Entwicklungswerkzeug:

```sh
npm test
npm run samples
```

Oder **[Browser-Testseite](tests/test-runner.html)** öffnen. 114 Tests prüfen
Big Endian, signed/unsigned Grenzen, bitweise Referenzwerte, alle sechs Muster,
PNG-Alpha/Farbzuordnung, History und Bildoperationen. Für die Größen
16×16/1, 32×32/2, 48×32/2, 47×31/2, 17×16/2, 33×16/2 und 48×32/3 werden
Padding und vollständige Normal-/Selected-Roundtrips geprüft. Jede mögliche
Verkürzung einer Testdatei muss einen Fehler auslösen. Zusätzliche synthetische
Tests prüfen NewIcons mit mehrzeiliger Palette, bitweise ColorIcon-RLE,
Palettenübernahme zwischen Zuständen, OS4 mit beiden bekannten Längenvarianten,
begrenzte Dekompression sowie PNG-Chunk-Grenzen und CRC.

Optionaler Integrationstest mit extern installiertem Playwright:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/browser.test.mjs
# TEST_URL kann bei Bedarf die Standardadresse http://127.0.0.1:8080 ersetzen.
```

Die Tests wurden am 07.09.2026 mit Chromium 134 und Firefox 135 unter Playwright
1.51.1 ausgeführt: Offline PNG → Pixelbearbeitung → Wetter.info → erneuter Import,
Undo/Redo, Werkzeuge, PNG-Modi, PNG-Export, Fehlerfälle, Desktop/Tablet/Mobil und
Browser-Kernprüfungen. Keine Datei-Upload-Anfragen, keine JS-Laufzeitfehler.
Edge wurde nicht separat ausgeführt; es verwendet ebenfalls Chromium.

Unabhängiger Gegencheck mit dem unveränderten Referenzprojekt:

```sh
node scripts/verify-reference.mjs /path/to/Amiga-Icon-Editor
```

Dieser vergleicht alle Sample-Pixel und zentrale Metadaten mit dem
Referenzparser und liest zusätzlich eine durch dessen Writer erzeugte Datei.

Erweiterte Offline-Browsertests mit synthetischen modernen Icons:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/modern-browser.test.mjs
```

Optional kann `ICON_REFERENCE=/path/to/Amiga-Icon-converter` gesetzt werden, um
auch die externen Beispiel-Icons aus Steffests Konverter zu testen. Diese
Bilddateien werden nicht mit diesem Projekt verteilt. Der unabhängige
Pixelvergleich ist separat ausführbar:

```sh
node scripts/verify-modern-reference.mjs /path/to/Amiga-Icon-converter
```

Die modernen Importtests wurden mit Chromium und Firefox offline ausgeführt.
15 externe moderne Icons wurden vor der Farbreduktion pixelgenau mit dem
Referenzdecoder verglichen. Beide Browser prüften außerdem sechs synthetische
Formatfälle und die 21 externen Beispiel-Icons einschließlich klassischem Export.

Erzeugte Dateien:

- [wb13-tool-48x32-4colors.info](samples/wb13-tool-48x32-4colors.info)
- [wb13-project-48x32-4colors.info](samples/wb13-project-48x32-4colors.info)
- [wb13-padding-test-47x31.info](samples/wb13-padding-test-47x31.info)
- [Test.info](samples/Test.info)

Die 48×32-Dateien haben je 886 Bytes, die 47×31-Datei 862 Bytes, jeweils mit
Normal und Selected. `Test.info` entspricht dem ersten funktionierenden Meilenstein.

**Binärtests erfolgreich, echter WinUAE-/Amiga-Test noch ausstehend.**
Es waren weder ein Amiga noch eine lizenzierte Kickstart-/Workbench-Testumgebung
verfügbar. Binärtests und unabhängiges Gegenlesen ersetzen diesen Akzeptanztest nicht.

Für die Abnahme: Datei im Binärmodus auf Amiga/WinUAE mit Kickstart 1.3 und
Workbench 1.3 kopieren, Normal/Selected prüfen, über die Icon-Information
WBTOOL und StackSize 16384 prüfen und automatische Positionierung beobachten.
Für einen Starttest zusätzlich ein geeignetes gleichnamiges Amiga-Programm
neben dessen `.info` ablegen. Auch das 47-Pixel-Padding-Sample prüfen.

## Statische Bereitstellung

Die Anwendung kann mit nginx, Apache oder einem statischen Hosting-Dienst
bereitgestellt werden. Als Webroot dient das Projektverzeichnis; die Startdatei
ist `index.html`. HTML, CSS und JavaScript müssen mit passenden MIME-Typen
ausgeliefert werden. Eine Backend-Konfiguration ist nicht erforderlich.

- Webroot, Hostname, Port und gegebenenfalls HTTPS für die eigene Umgebung wählen.
- Dem Webserver Leserechte auf die statischen Dateien geben; Schreibrechte auf
  das Projektverzeichnis sind für den Betrieb nicht erforderlich.
- Versteckte Verzeichnisse wie `.git` sowie lokale Laufzeitdateien und
  Deployment-Konfigurationen vom öffentlichen Zugriff ausschließen.
- Bestehende Websites über einen separaten VHost oder Webroot erhalten.
- Vor Änderungen am laufenden Webserver dessen Konfiguration prüfen, etwa mit
  `nginx -t` oder `apachectl configtest`. Erst nach erfolgreichem Test neu laden.

Die Dateien unter `deploy/` zeigen eine mögliche nginx-/systemd-Einrichtung.
Darin enthaltene Pfade und Betriebsparameter müssen vor Verwendung an die eigene
Installation angepasst werden. nginx und systemd sind keine Voraussetzungen
für die Anwendung; ein statischer HTTP-Webserver genügt.

## Herkunft und technische Quellen

BinaryStream-API und DiskObject-/Image-Feldabfolge wurden aus
[Steffests Amiga-Icon-Editor](https://github.com/steffest/Amiga-Icon-Editor)
adaptiert, Referenzrevision `52fb20f51c90e45b0243c72e7ef83f943a387483`.
`_script/lib/file.js` und `_script/lib/icon.js` sind die wesentlichen Quellen;
`main.js`, `imageProcessing.js`, `quantize.js` wurden geprüft, nicht übernommen.
Die modernen Decoder orientieren sich zusätzlich an
[Amiga-Icon-converter](https://github.com/steffest/Amiga-Icon-converter),
Revision `8718bdb1a0b7be42c5ea1d1ca0cfb7f05065f5dc` (MIT, Steffest).
ColorIcon-RLE, NewIcon-Symbole und die ARGB-Feldabfolge wurden daraus adaptiert,
mit zusätzlichen Grenzen und korrigierter mehrzeiliger Palettenbehandlung.
PNG-Containerprüfung, begrenzte native Dekompression, Bitplanes,
Palette-Quantisierung, UI und History sind eigenständige Implementierungen.
Die originalen Copyright-Vermerke und MIT-Lizenz stehen vollständig in
[THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md). Eigener Code: [MIT](LICENSE).

Die Feldsemantik, Gadget-Flags und DrawerData-Anforderungen wurden gegen die
[AmigaOS Icon-Library-Dokumentation](https://wiki.amigaos.net/wiki/Icon_Library)
geprüft. PlanePick/PlaneOnOff folgen den
[Intuition-Image-Strukturen](https://wiki.amigaos.net/wiki/Intuition_Images).
