# Physik Optik

Interaktive Lernseite für Klasse 9. `index.html` lässt sich direkt im Browser
öffnen. Die Lerninhalte, Simulationen und Aufgaben funktionieren ohne Server;
Videos benötigen eine Internetverbindung.

Tests der Spiegel-Simulationen ohne zusätzliche Pakete:

```sh
node tests/optics.test.cjs
```

Browserprüfungen mit Playwright und installiertem Chromium:

```sh
node tests/browser.cjs
```

Playwright muss im Node-Suchpfad liegen. Alternativ kann `PLAYWRIGHT_MODULE` auf
ein vorhandenes Playwright-Modul verweisen. Die Prüfungen decken sechs
Bildschirmbreiten, Hell- und Dunkelmodus, Tastaturbedienung, Quiz, schriftliche
Aufgaben, Simulationen ohne JavaScript und den Video-Player ab. Videoaufrufe
werden durch lokale Testantworten ersetzt. Mit `OPTIK_SCREENSHOTS=/tmp/optik`
lassen sich zusätzlich Bildschirmaufnahmen außerhalb des Projekts speichern.
