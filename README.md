# Physik Optik

Interaktive Lernseite für Klasse 9. `index.html` lässt sich direkt im Browser
öffnen. Die Lerninhalte, Simulationen und Aufgaben funktionieren ohne Server;
Videos benötigen eine Internetverbindung.

Der Button **Lernzettel** in der Kapitel-Leiste öffnet `lernzettel.html`: eine
Zusammenfassung aller sieben Kapitel mit Erklärungen, Beispielen und Skizzen
am Rand. **Drucken / als PDF speichern** öffnet den Druckdialog. Die Druckansicht
verteilt die Kapitel 1–4 und 5–7 auf zwei DIN-A4-Seiten
im Hochformat bei 100 % Skalierung ausgelegt; Browser-Kopf- und Fußzeilen sollten
ausgeschaltet sein. Der Lernzettel funktioniert ebenfalls offline.

Tests der Spiegel-Simulationen ohne zusätzliche Pakete:

```sh
node tests/optics.test.cjs
```

Browserprüfungen mit Playwright und installiertem Chromium:

```sh
node tests/browser.cjs
node tests/lernzettel.test.cjs
```

Playwright muss im Node-Suchpfad liegen. Alternativ kann `PLAYWRIGHT_MODULE` auf
ein vorhandenes Playwright-Modul verweisen. Die Prüfungen decken sechs
Bildschirmbreiten, Hell- und Dunkelmodus, Tastaturbedienung, Quiz, schriftliche
Aufgaben, Simulationen ohne JavaScript und den Video-Player ab. Videoaufrufe
werden durch lokale Testantworten ersetzt. Mit `OPTIK_SCREENSHOTS=/tmp/optik`
lassen sich zusätzlich Bildschirmaufnahmen außerhalb des Projekts speichern.
Die Lernzettel-Prüfung kontrolliert außerdem den Einstieg auf kleinen Displays,
den Druckbutton, die zweiseitige A4-PDF-Ausgabe und die Ansicht ohne JavaScript.
