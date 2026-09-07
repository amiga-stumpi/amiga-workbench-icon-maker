# Amiga Workbench 1.x Icon Maker

Ein statischer HTML/CSS/Vanilla-JavaScript-Editor für klassische Amiga-`.info`-Dateien.
Alle Pixel, PNGs und Binärdaten bleiben im Browser. Keine Uploads, Datenbank,
Backend-API, CDN-Ressourcen oder Laufzeitabhängigkeit von Node.js.

## Start und bereitgestellte Instanz

- Projekt: `/opt/amigaiconmaker`
- Server im lokalen Netz: **http://192.168.25.60:8080/**
- Auf dem Server selbst: http://127.0.0.1:8080/
- Webserver: nginx 1.24.0, Ubuntu-Paket `1.24.0-2ubuntu7.17`, isoliert unter `.runtime/`.
- Dienst: `systemctl --user status amiga-icon-maker.service`

Zu Beginn war kein nginx/Apache aktiv und kein Webroot vorgegeben. Daher läuft
nginx als eigener Benutzerdienst von `madzel` auf Port 8080. Es wurden keine
bestehenden VHosts verändert. Der Dienst ist aktiviert; `loginctl` Linger ist
für `madzel` eingeschaltet, damit er auch ohne Anmeldung läuft. Der Hostname ist
`toolchain`; dessen Namensauflösung hängt vom lokalen Netz ab. Öffentliche
Erreichbarkeit, DNS und HTTPS wurden nicht eingerichtet.

Alternativ den Projektordner auf einen beliebigen statischen HTTP-Webserver
kopieren und `index.html` aufrufen. Es gibt keinen Build-Schritt. Die JS-Module
brauchen HTTP(S); direktes Öffnen über `file://` wird nicht unterstützt.
Für einen optionalen lokalen Entwicklungstest genügt beispielsweise
`python3 -m http.server 8080 --directory /opt/amigaiconmaker` (nur wenn der Port frei ist).
Python verarbeitet hierbei keine Icons, sondern liefert nur statische Dateien.

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
rückgängig zu machen. Dateien sind auf 2 MiB begrenzt.

Ein fehlendes Selected wird als bearbeitbare Normal-Kopie angezeigt, aber sein
Export bleibt ausdrücklich deaktiviert. Ohne Selected exportiert der Writer
den klassischen Complement-Highlight-Modus. StackSize 0 in einer Altdatei wird
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

Nicht unterstützt: NewIcons (IM1=/IM2=-ToolTypes), ColorIcon/GlowIcon (FORM ICON),
PNG/DualPNG/OS4-Icons, neuere userData-Revisionen, ARGB, Border-Gadgets,
verkettete Images, Plane-Zuordnungen jenseits von Pen 7, Bilder außerhalb der
Gadget-Fläche und unbekannte Dateianhänge. Sie werden mit Fehlermeldung
abgelehnt, nicht stillschweigend zu OldIcons konvertiert.

**DrawerData:** WBDISK, WBDRAWER und WBGARBAGE benötigen laut Amiga-Dokumentation
DrawerData. Diese Typen sind auswählbar, Export ohne DrawerData ist gesperrt.
Aus einer klassischen Vorlage gelesene 56-Byte-DrawerData bleiben erhalten.
Neue DrawerData erzeugen oder deren Fensterparameter bearbeiten ist noch nicht
implementiert. OS2+-Drawer-Erweiterungen werden nicht importiert.

DefaultTool und ToolTypes sind bereits im UI und Binärkern implementiert:
Latin-1, keine eingebetteten Nullzeichen, maximal 4095 Zeichen pro Text und
1024 ToolTypes. Für bestmögliche Amiga-Kompatibilität ToolTypes kurz halten
(die Amiga-Dokumentation empfiehlt höchstens 128 Bytes). ToolWindow wird vom
Parser/Writer erhalten, hat jedoch kein eigenes Bearbeitungsfeld.

Noch offen: echte WinUAE-/Amiga-Abnahme, DrawerData-Erzeugung/Editor,
Clipboard-Import, Dithering und dauerhafte Browser-Projektspeicherung.
Neuere Iconformate gehören ausdrücklich nicht zum Umfang dieser Version.

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

Oder **[Browser-Testseite](tests/test-runner.html)** öffnen. 101 Tests prüfen
Big Endian, signed/unsigned Grenzen, bitweise Referenzwerte, alle sechs Muster,
PNG-Alpha/Farbzuordnung, History und Bildoperationen. Für die Größen
16×16/1, 32×32/2, 48×32/2, 47×31/2, 17×16/2, 33×16/2 und 48×32/3 werden
Padding und vollständige Normal-/Selected-Roundtrips geprüft. Jede mögliche
Verkürzung einer Testdatei muss einen Fehler auslösen.

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

## Serverbetrieb

Konfiguration: `deploy/nginx.conf`, Dienstdatei: `deploy/amiga-icon-maker.service`.
Nur statische GET/HEAD-Zugriffe sind erlaubt; versteckte Verzeichnisse (inklusive
`.git`/`.runtime`) und Deployment-Skripte sind nicht über HTTP abrufbar.
Die Dateien benötigen nur normale Leserechte, kein `chmod 777`.

Vor einem Reload zwingend Konfiguration testen (der Dienst führt denselben Test
auch automatisch vor Start/Reload aus):

```sh
/opt/amigaiconmaker/.runtime/nginx/usr/sbin/nginx -t \
  -p /opt/amigaiconmaker/.runtime/ \
  -c /opt/amigaiconmaker/deploy/nginx.conf
# Nur bei erfolgreichem Test:
systemctl --user reload amiga-icon-maker.service
```

Stop/Start: `systemctl --user stop amiga-icon-maker.service` bzw. `start`.
Fehlerprotokoll: `.runtime/error.log`; Dienstlog:
`journalctl --user -u amiga-icon-maker.service`.

Das isolierte nginx-Paket wird nicht automatisch von systemweitem apt aktualisiert.
Für Updates ein aktuelles Ubuntu-nginx-Paket mit `apt download nginx` beziehen,
mit `dpkg-deb -x` in ein neues Verzeichnis entpacken, den neuen Binary-Pfad testen
und im Dienst ersetzen; anschließend Dienst neu starten. Alternativ kann ein
Administrator die statischen Dateien in eine regulär gepflegte Webserver-
Installation übernehmen. `.runtime/` ist nicht Teil des Git-Repositories.

## Herkunft und technische Quellen

BinaryStream-API und DiskObject-/Image-Feldabfolge wurden aus
[Steffests Amiga-Icon-Editor](https://github.com/steffest/Amiga-Icon-Editor)
adaptiert, Referenzrevision `52fb20f51c90e45b0243c72e7ef83f943a387483`.
`_script/lib/file.js` und `_script/lib/icon.js` sind die wesentlichen Quellen;
`main.js`, `imageProcessing.js`, `quantize.js` wurden geprüft, nicht übernommen.
Bitplanes, Palette-Quantisierung, UI und History sind eigenständige Implementierungen.
Die originalen Copyright-Vermerke und MIT-Lizenz stehen vollständig in
[THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md). Eigener Code: [MIT](LICENSE).

Die Feldsemantik, Gadget-Flags und DrawerData-Anforderungen wurden gegen die
[AmigaOS Icon-Library-Dokumentation](https://wiki.amigaos.net/wiki/Icon_Library)
geprüft. PlanePick/PlaneOnOff folgen den
[Intuition-Image-Strukturen](https://wiki.amigaos.net/wiki/Intuition_Images).
