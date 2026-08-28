# Plaque Bingo France 🇫🇷

Ein einfaches Browser-Spiel für den Frankreich-Urlaub: Kennzeichen-Départements sammeln wie bei Bingo.

## Spielen

1. Öffne die App (lokal oder auf GitHub Pages).
2. Gib die Nummer vom Kennzeichen ein (z.B. `22`, `75`, `2A`, `971`).
3. Klicke **Eintragen** — Name und Karte des Départements erscheinen.
4. In der Bingo-Übersicht siehst du, was du schon hast.

## Features

- Alle 101 Départements (inkl. Korsika 2A/2B und Übersee)
- Automatisches Speichern im Browser (localStorage)
- Export/Import als einfache Textdatei
- Kleine Karte mit Marker für das gefundene Département

## Lokal testen

```bash
python3 -m http.server 8080
```

Dann im Browser: `http://localhost:8080`

## GitHub Pages (empfohlen)

GitHub Pages ist ideal für dieses Spiel — kostenlos, kein Server, funktioniert gut auf dem Handy:

1. Repository auf GitHub pushen
2. **Settings → Pages → Build and deployment**
3. **Source:** GitHub Actions
4. Nach dem Merge auf `main` deployt der Workflow automatisch

Die App ist dann unter `https://<dein-user>.github.io/LicensePlateGame/` erreichbar.

## Dateiformat (Export)

```
# Plaque Bingo France
# Exportiert: 28.08.2026, 10:00:00
# Gefunden: 3 / 101

22	Côtes-d'Armor
75	Paris
13	Bouches-du-Rhône
```
