/**
 * End-to-End-Test: startet die gebaute App in einem jsdom-Browser,
 * redet mit dem laufenden Express-Server und klickt sich durch alle Seiten.
 */
import { JSDOM, VirtualConsole } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, "..", "client", "dist");
const ORIGIN = process.env.ORIGIN || "http://localhost:3001";

const assert = (label, cond, extra = "") => {
  console.log(`${cond ? "ok  " : "FAIL"} ${label}${cond ? "" : ` ${extra}`}`);
  if (!cond) process.exitCode = 1;
};

const html = readFileSync(resolve(dist, "index.html"), "utf8");
const scriptSrc = html.match(/src="(\/assets\/[^"]+\.js)"/)?.[1];
assert("Build vorhanden", Boolean(scriptSrc), scriptSrc ? "" : "kein JS-Bundle in dist/index.html");
if (!scriptSrc) process.exit(1);

const bundle = readFileSync(resolve(dist, scriptSrc.replace(/^\//, "")), "utf8");

const virtualConsole = new VirtualConsole();
const consoleErrors = [];
virtualConsole.on("jsdomError", (e) => consoleErrors.push(e.message));
virtualConsole.on("error", (...a) => consoleErrors.push(a.join(" ")));
const dom = new JSDOM(html, {
  url: `${ORIGIN}/`,
  runScripts: "outside-only",
  pretendToBeVisual: true,
  virtualConsole,
});

const { window } = dom;

// React braucht matchMedia, ResizeObserver und requestAnimationFrame im Testfenster.
window.matchMedia = () => ({
  matches: false,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent: () => false,
});
window.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
window.scrollTo = () => {};
// jsdom kennt confirm nicht – Löschen wird im Test immer bestätigt.
window.confirm = () => true;
if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  window.cancelAnimationFrame = (id) => clearTimeout(id);
}

// fetch auf das richtige Origin zeigen, bevor die App startet.
const realFetch = globalThis.fetch;
window.fetch = (input, init) =>
  realFetch(typeof input === "string" && input.startsWith("/") ? ORIGIN + input : input, init);

const tick = (ms = 60) => new Promise((r) => setTimeout(r, ms));
const text = () => window.document.body.textContent;
const $ = (sel) => window.document.querySelector(sel);
const $$ = (sel) => [...window.document.querySelectorAll(sel)];
const byText = (sel, needle) => $$(sel).find((el) => el.textContent.trim().includes(needle));

/** Wartet bis ein Element da ist – nötig wegen der Erfolgs-Animation. */
const waitFor = async (sel, needle, ms = 4000) => {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const el = byText(sel, needle);
    if (el) return el;
    await tick(80);
  }
  return undefined;
};

// ---------------------------------------------------------------- Onboarding
const run = (bundleSource) => window.eval(bundleSource);
run(bundle);
await tick(400);

assert("Onboarding erscheint", text().includes("Wie soll dich die Community nennen?"));
assert("Kein Serverfehler im Log", consoleErrors.length === 0, consoleErrors.join(" | "));

// Namen eingeben
const input = $('input[placeholder="Dein Name..."]');
assert("Namensfeld vorhanden", Boolean(input));
const setValue = (el, value) => {
  const proto = window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
  el.dispatchEvent(new window.Event("input", { bubbles: true }));
};
setValue(input, "Markus");
await tick(60);
byText("button", "Loslegen").click();
await tick(600);

assert(
  `Name im localStorage`,
  window.localStorage.getItem("pullup_username") === "Markus",
  window.localStorage.getItem("pullup_username") || "(leer)",
);
assert(
  "Session-Token gespeichert",
  Boolean(window.localStorage.getItem("pullup_session")),
  "(leer)",
);
assert("Header sichtbar", text().includes("FitPro"));

const sessionHeader = { "X-Session": window.localStorage.getItem("pullup_session") };

// -------------------------------------------------------------------- Home
assert("Startseite zeigt Klimmzüge", text().includes("Klimmzüge"));
assert("Level-Karte vorhanden", text().includes("Dein Level"));
assert("Momentum-Karte vorhanden", text().includes("Momentum"));
assert("Wochenchart vorhanden", text().includes("Diese Woche"));
assert("Tages-Challenge vorhanden", text().includes("Tages-Challenge"));
assert("Abzeichen vorhanden", text().includes("Abzeichen"));

const totalBefore = Number(byText(".font-heading.font-bold.text-2xl", "0")?.textContent || 0);
const levelLine = text().match(/Level (\d+) – (\w+)/);
assert("Level wird berechnet", Boolean(levelLine), "kein 'Level n – Name'");
if (levelLine) console.log(`     → Level ${levelLine[1]} (${levelLine[2]})`);

// 7 Klimmzüge eintragen
setValue($('input[type="number"]'), "7");
await tick(60);
byText("button", "7 Klimmzüge eintragen").click();
await tick(800);
assert("Eintrag gespeichert", text().includes("Eingetragen!"), "kein Erfolgs-Feedback");

const health = await realFetch(`${ORIGIN}/api/entries/pull`).then((r) => r.json());
const mine = health.filter((e) => e.userName === "Markus" && e.date === new Date().toISOString().slice(0, 10));
assert(
  "Neuer Eintrag in der Datenbank",
  mine.reduce((a, e) => a + e.count, 0) >= 7,
  JSON.stringify(mine.slice(0, 3)),
);

// ---- Obergrenze: 255 Reps müssen gehen ---------------------------------
// Der Erfolgs-Banner blendet den Knopf für 1,5 s aus – erst darauf warten.
const addBtn = await waitFor("button", "Klimmzüge eintragen");
assert("Eingabe wieder frei", Boolean(addBtn), text().slice(0, 120));
setValue($('input[type="number"]'), "200");
await tick(60);
assert(
  "200 wird akzeptiert",
  Boolean(byText("button", "200 Klimmzüge eintragen")),
  text().match(/\d+ Klimmzüge eintragen/)?.[0] || "Knopf-Text fehlt",
);
byText("button", "200 Klimmzüge eintragen").click();
await tick(900);
const big = await realFetch(`${ORIGIN}/api/entries/pull`).then((r) => r.json());
assert(
  "200er-Eintrag in der Datenbank",
  big.some((e) => e.userName === "Markus" && e.count === 200),
  "nicht gefunden",
);
const tooBig = await realFetch(`${ORIGIN}/api/entries/pull`, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...sessionHeader },
  body: JSON.stringify({ count: 256 }),
});
assert("256 wird abgelehnt", tooBig.status === 400, `HTTP ${tooBig.status}`);

// ------------------------------------------------------------------- Stats
byText("a", "Stats").click();
await tick(500);
assert("Statistiken geladen", text().includes("Statistiken"));
assert("Rekorde vorhanden", text().includes("Rekorde"));
assert("Ø Tag vorhanden", text().includes("Ø Tag"));
assert("Bestenliste", text().includes("Beste Woche"));
const legend = text().includes("💎 Klimmzüge") && text().includes("🪙 Liegestützen");
assert("Diagramm-Legende", legend);

// Woche zurückspringen (letzte Woche)
const back = $("button:has(use)") || $$("button").find((b) => b.innerHTML.includes("lucide-chevron-left"));
if (back) {
  back.click();
  await tick(300);
  assert("Wochenwechsel", text().includes("Letzte Woche"), "Label fehlt");
}

// ---------------------------------------------------------------- Ranking
byText("a", "Rangliste").click();
await tick(600);
assert("Rangliste geladen", text().includes("Rangliste"));
assert("Eigene Zeile markiert", text().includes("(Du)"));
assert("Medaillen-Piktogramme", /🥇|🥈|🥉/.test(text()));
const names = ["Markus", "Sabine", "Jonas", "Lena", "Tobias"].filter((n) => text().includes(n));
assert("Demo-Sportler in der Liste", names.length >= 3, names.join(", "));
console.log(`     → ${names.length} Sportler gelistet`);

// Challenge beitreten
const joinBtn = byText("button", "Mitmachen");
if (joinBtn) {
  joinBtn.click();
  await tick(600);
  assert("Challenge beitreten", !byText("button", "Mitmachen"), "Button noch da");
}

// -------------------------------------------------------------- Challenges
byText("a", "Challenges").click();
await tick(600);
assert("Challenges geladen", text().includes("Challenges"));
assert("Laufende Challenges", text().includes("Läuft gerade"));
assert("Neue-Challenge-Knopf", text().includes("Neue Challenge"));

byText("button", "Neue Challenge").click();
await tick(400);
assert("Challenge-Formular offen", text().includes("Vorlage wählen"));

setValue($('input[placeholder="Name"]'), "E2E-Test");
setValue($('input[type="number"]'), "42");
setValue($('input[type="date"]'), "2026-12-31");
await tick(80);
const startBtn = byText("button", "Challenge starten!");
assert("Start-Knopf aktiv", startBtn && !startBtn.disabled);
startBtn.click();
await tick(800);
assert("Challenge angelegt", text().includes("E2E-Test"), "Titel fehlt in der Liste");

const created = await realFetch(`${ORIGIN}/api/challenges/pull`).then((r) => r.json());
assert("Challenge in der Datenbank", created.some((c) => c.title === "E2E-Test"));

// ------------------------------------------------------------------ Avatar
byText("a", "Avatar").click();
await tick(600);
assert("Avatar geladen", text().includes("Avatar"));
assert("Farben-Liste", text().includes("Farben"));
assert("Rahmen-Liste", text().includes("Rahmen"));
assert("Erfolge-Liste", text().includes("Erfolge"));
assert("Season-Anzeige", /Season \d+/.test(text()));
const repLine = text().match(/(\d+) Reps gesamt/);
if (repLine) console.log(`     → ${repLine[1]} Reps`);

// Ein freigeschaltetes Item ausrüsten
const firstOwned = $$("button:not([disabled])").find(
  (b) => b.textContent.includes("Antippen zum Ausrüsten") || b.textContent.includes("Ausgerüstet"),
);
assert("Item-Kacheln klickbar", Boolean(firstOwned));
if (firstOwned) {
  firstOwned.click();
  await tick(700);
  assert("Item ausgerüstet", text().includes("Ausgerüstet"));
  const cols = await realFetch(`${ORIGIN}/api/user-collections`).then((r) => r.json());
  const me = cols.find((c) => c.userName === "Markus");
  assert("Avatar serverseitig gespeichert", Boolean(me?.equippedColorId || me?.equippedFrameId), JSON.stringify(me));
}

// ------------------------------------------------------------------- 404
window.history.pushState({}, "", "/gibtsnicht");
window.dispatchEvent(new window.PopStateEvent("popstate"));
await tick(400);
assert("404-Seite", text().includes("404"));

// ---------------------------------------------------------------- Verlauf
byText("a", "Verlauf").click();
await tick(700);
assert("Verlauf geladen", text().includes("Verlauf"));
assert("Heute-Gruppe", text().includes("Heute"));
assert("Summen-Kacheln", text().includes("Klimmzüge") && text().includes("Liegestützen"));

const before = await realFetch(`${ORIGIN}/api/my-entries`, { headers: sessionHeader }).then((r) => r.json());
assert("Historie gefüllt", before.length > 0, `${before.length} Einträge`);
console.log(`     → ${before.length} Einträge in der Historie`);

// Genau einen Eintrag löschen
const delBtn = $('button[aria-label^="Eintrag"]');
assert("Löschen-Knopf vorhanden", Boolean(delBtn), "kein aria-label 'Eintrag …'");
const deleteLabel = delBtn?.getAttribute("aria-label");
delBtn?.click();
await tick(800);

const after = await realFetch(`${ORIGIN}/api/my-entries`, { headers: sessionHeader }).then((r) => r.json());
assert("Eintrag wirklich gelöscht", after.length === before.length - 1, `${before.length} → ${after.length}`);
console.log(`     → gelöscht: ${deleteLabel}`);

// Fremde Einträge sind geschützt
const sabine = big.find((e) => e.userName === "Sabine");
const foreign = await realFetch(`${ORIGIN}/api/entries/${sabine.id}`, {
  method: "DELETE",
  headers: sessionHeader,
});
assert("Fremder Eintrag nicht löschbar", foreign.status === 404, `HTTP ${foreign.status}`);

const stillThere = await realFetch(`${ORIGIN}/api/entries/pull`).then((r) => r.json());
assert("Fremder Eintrag noch da", stillThere.some((e) => e.id === sabine.id), "doch gelöscht!");

// Ohne Token geht gar nichts
const anonymous = await realFetch(`${ORIGIN}/api/entries/pull`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ count: 5, userName: "Sabine" }),
});
assert("Ohne Session kein Schreiben", anonymous.status === 401, `HTTP ${anonymous.status}`);

// --------------------------------------------------------------- Abmelden
byText("button", "Abmelden").click();
await tick(700);
assert("Zurück im Onboarding", text().includes("Wie soll dich die Community nennen?"), text().slice(0, 80));
assert(
  "Token wirklich weg",
  !window.localStorage.getItem("pullup_session"),
  window.localStorage.getItem("pullup_session") || "(leer)",
);
const revoked = await realFetch(`${ORIGIN}/api/my-entries`, { headers: sessionHeader });
assert("Altes Token abgewiesen", revoked.status === 401, `HTTP ${revoked.status}`);

// ----------------------------------------------------------- Fehlerprotokoll
const realErrors = consoleErrors.filter((m) => !/Could not parse CSS|Error: Not implemented/i.test(m));
assert("Keine Laufzeitfehler", realErrors.length === 0, realErrors.slice(0, 3).join(" | "));

console.log(process.exitCode ? "\nFEHLER vorhanden" : "\nEnd-to-End-Test bestanden");
window.close();
