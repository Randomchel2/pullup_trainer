# PullUp Trainer — lokale Kopie

Kopie der App von [pulluptrainer.base44.app](https://pulluptrainer.base44.app/).
Gleiche Oberfläche, gleiche Spiellogik, gleiche Texte — aber mit eigenem Backend
(Express + SQLite) statt base44. Läuft komplett offline.

## Schnellstart

```bash
npm install
npm run seed     # Demo-Daten (optional, aber hilfreich)
npm run dev      # API auf :3001, Web auf :5173
```

Dann http://localhost:5173 öffnen. Beim ersten Mal wird nach einem Nickname gefragt.
Mit `Markus` sieht man sofort volle Statistiken, mit einem neuen Namen startet man bei null.

## Produktion

```bash
npm run build    # baut client/dist
npm start        # Express liefert Frontend + API auf :3001
```

## Aufbau

```
client/          React + Vite + Tailwind (wie das Original)
  src/lib/game.js     Spiellogik: Level, Abzeichen, Momentum, Serie, Kosmetik
  src/data/           aus dem Original extrahierte Konstanten (Level, Medaillen, Items …)
  src/pages/          Home, Stats, Rangliste, Challenges, Verlauf, Avatar
  src/components/     UI-Bausteine, Avatar, Diagramme, Popups, EntryList
server/          Express + node:sqlite
  src/db.js           Schema + Queries
  src/index.js        REST-API, liefert im Prod auch das Frontend
  src/seed.js         Demo-Daten
deploy/          systemd-Unit, Caddyfile, Backup-Skript
test/smoke.jsx   Logik-Prüfungen + SSR-Render aller Seiten
test/e2e.mjs     Klickt die gebaute App im jsdom-Browser durch
```

## Anmeldung und Rechte

Beim ersten Aufruf wird ein Nickname vergeben. Der Server antwortet mit einem
Token, der im `localStorage` liegt und bei jedem Schreibzugriff als
`X-Session`-Header mitgeschickt wird.

**Der Name kommt ausschließlich aus dem Token**, nie aus dem Request-Body.
Damit kann sich niemand unter fremdem Namen eintragen, und Löschen-Aktionen
lassen sich auf eigene Datensätze beschränken:

| Aktion | Regel |
| --- | --- |
| Eintrag löschen | nur eigene Einträge, sonst 404 |
| Challenge löschen | nur selbst erstellte, sonst 404 |
| Challenge bearbeiten | offen — Teilnehmer können beitreten |
| Avatare speichern | nur die eigene Sammlung |
| `POST /api/dev/reset` | existiert nur, wenn `NODE_ENV` **nicht** `production` ist |

Lesende Endpunkte (Rangliste, Challenges, Avatare) bleiben offen, sonst könnte
niemand die Rangliste sehen.

**Wichtig für den öffentlichen Betrieb:** es gibt bewusst *kein Passwort*.
Wer den Nickname kennt, kann unter diesem Namen trainieren und – nach einem
Neu-Aufsetzen ohne gleiche IP – alte Einträge nicht mehr sehen. Für den
privaten Betrieb unter Freunden reicht das; für eine öffentliche Instanz
gehört davor noch ein Passwort- oder Magic-Link-Login.

## API

| Methode | Route | Session | Zweck |
| --- | --- | --- | --- |
| POST | `/api/sessions` | – | Nickname → Token |
| DELETE | `/api/sessions` | ✓ | Token widerrufen (Abmelden) |
| GET | `/api/entries/:kind` | – | Einträge (`pull` \| `push`), neueste zuerst |
| GET | `/api/my-entries` | ✓ | eigene Einträge beider Sportarten |
| POST | `/api/entries/:kind` | ✓ | Eintrag anlegen (`count` 1–255) |
| DELETE | `/api/entries/:id` | ✓ | eigener Eintrag löschen |
| GET | `/api/user-collections` | – | Avatare aller Nutzer |
| PUT | `/api/user-collections` | ✓ | eigenen Avatar speichern |
| GET | `/api/challenges/:kind` | – | Challenges |
| POST | `/api/challenges/:kind` | ✓ | Challenge anlegen |
| PATCH | `/api/challenges/:id` | ✓ | Teilnehmer / Felder ändern |
| DELETE | `/api/challenges/:id` | ✓ | eigene Challenge löschen |
| GET | `/api/health` | – | Status, `maxReps`, ob dev-routes aktiv |
| POST | `/api/dev/reset` | – | **nur** außerhalb von `production` |

Einträge sehen so aus:
`{ "id": 1, "kind": "pull", "count": 12, "date": "2026-09-29", "userName": "Markus" }`

### Umgebungsvariablen

| Variable | Standard | Bedeutung |
| --- | --- | --- |
| `PORT` | `3001` | Port |
| `HOST` | `127.0.0.1` in prod, sonst `0.0.0.0` | Bindeadresse |
| `NODE_ENV` | – | `production` schaltet dev-routes ab |
| `PULLUP_DB` | `server/data/pullup.db` | Pfad zur SQLite-Datei |
| `ALLOW_DEV_ROUTES` | `1` | auf `0` schaltet dev-routes auch außerhalb von `production` ab |

## Features

Alles aus dem Original, plus:

- **Verlauf** (`/history`) — eigene Einträge beider Sportarten, nach Tag gruppiert,
  mit Tagessumme. Filter auf Klimmzüge / Liegestützen.
- **Löschen** — Papierkorb an jedem Eintrag, auf der Startseite (die letzten 5)
  und im Verlauf (alle). Fremde Einträge sind geschützt.
- **Bis 255 Reps pro Eintrag** (ein Byte). Schnellwahl 1/3/5/10/15/20/30/50,
  Stepper und Eingabefeld gehen bis 255, serverseitig erzwungen.
- **Abmelden** am Ende des Verlaufs — widerruft das Token.

## Spiellogik

Übernommen aus dem Original, 1:1:

- **Level** — 30 Stufen von *Anfänger* (0) bis *Übermensch* (50 000 Klimmzüge).
  Klimmzüge zählen, Liegestützen nicht.
- **Münzen** — `2 × Klimmzüge + 1 × Liegestützen`. Bestimmen Kosmetik-Fortschritt.
- **Kosmetik** — 18 Farben und 18 Rahmen, vergeben über 18 Raritäts-Stufen
  (300 … 34 000 Reps). Seltenheit steuert Ring, Glow, Shimmer und Funkeln.
- **Erfolge** — 5 Stück, u. a. Platz 1 der Woche und Tagesbestände.
- **Abzeichen** — 8 Kategorien × Stufen: Gesamt, bester Tag, beste Woche, Serie,
  Wochenrang, Gesamt-Rang, aktive Wochen, perfekte Wochen (7/7 Tage). 39 Stück.
- **Momentum** — 0–100, wächst mit der Tageslast (Ziel 40 Reps/Tag) und halbiert
  sich an trainingsfreien Tagen.
- **Serie** — aufeinanderfolgende Tage mit mindestens einem Eintrag.
- **Tages-Challenge** — eine von acht Aufgaben, wechselt nach dem Tag des Jahres.

## Hosting im Internet

Der Dienst braucht eine feste Platte für die SQLite-Datei. Deshalb passt er
nicht auf Netlify/Vercel/Render (dort ist das Dateisystem ephemeral und die
Datenbank wäre nach jedem Neustart weg). Zwei Wege:

**A) Eigene VM — nichts am Code ändern.** Oracle Cloud *Always Free* (2 ARM-Kerne,
1 GB RAM) oder eine GCP e2-micro in `us-central1`. Dann:

```bash
git clone <dein-repo> /opt/pullup-trainer   # oder rsync/tar hochladen
cd /opt/pullup-trainer
sudo ./deploy/install.sh                     # Node, Nutzer, systemd, Backup-Timer, Caddy
sed -i 's/pullup.example.com/deine.domain/' deploy/Caddyfile
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy besorgt das TLS-Zertifikat automatisch. Die Dateien in `deploy/`:

| Datei | Zweck |
| --- | --- |
| `install.sh` | richtet alles auf einem frischen Debian/Ubuntu ein |
| `pullup-trainer.service` | systemd-Unit, lauscht in prod nur auf loopback |
| `Caddyfile` | HTTPS-Reverse-Proxy, optional mit Basic-Auth |
| `backup.sh` | konsistente SQLite-Sicherung via `VACUUM INTO` + gzip |
| `pullup-backup.timer` | täglich um 04:17, 14 Tage Aufbewahrung |

**B) Statisches Hosting + gehostete Datenbank.** Frontend nach Cloudflare Pages,
`server/src/db.js` auf Turso/Supabase umschreiben. `db.js` ist die einzige
Stelle, die SQLite kennt — der Rest des Servers bleibt. Aufwand: ~30 Minuten,
dafür gibt es Backups und Skalierung gratis.

## Tests

```bash
npm test        # Spiellogik + serverseitiges Rendering aller Routen (schnell)
```

46 Prüfungen: Schwellenwerte, Level, Serie, Momentum, Abzeichen, Kosmetik,
Historie-Gruppierung und das 255er-Limit. Rendert anschließend alle sieben
Routen mit gefülltem Daten-Cache.

```bash
npm start &     # Server auf :3001, Vite-Build wird von test:e2e erzeugt
npm run test:e2e
```

59 Prüfungen im jsdom-Browser: Onboarding, Token, 7 und 200 Reps eintragen,
256er-Ablehnung, Statistiken, Rangliste, Challenge anlegen, Avatar ausrüsten,
404, Verlauf mit Löschen, Löschschutz für fremde Einträge, Anmeldung ohne Token,
Abmelden mit Token-Entzug. Prüft dabei auch, was wirklich in SQLite landet.
Läuft nur gegen einen gestarteten Server auf `localhost:3001`.
