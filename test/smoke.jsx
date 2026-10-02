/* Smoke-Test: Logik + SSR-Render aller Seiten. Wird mit esbuild gebündelt. */
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement as h } from "react";

import App from "../client/src/App.jsx";
import * as game from "../client/src/lib/game.js";
import { MAX_REPS } from "../client/src/lib/api.js";
import { dayLabel, groupByDay } from "../client/src/components/EntryList.jsx";

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

// ---- 1. Spiellogik gegen bekannte Werte prüfen -------------------------
const assert = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${ok ? "" : ` -> ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`}`);
  if (!ok) process.exitCode = 1;
};

assert("30 Level", game.LEVELS.length, 30);
assert("Level 1 heißt", game.LEVELS[0].name, "Anfänger");
assert("Level 30 Schwelle", game.LEVELS[29].threshold, 50000);
assert("8 Medaillen-Kategorien je Sportart", game.MEDAL_CATEGORIES.pull.length, 8);
// 39 Medaillen: alle Kategorien à 5 Stufen, "Wochenrangliste" nur 4.
assert("39 Medaillen je Sportart", game.evaluateMedals("pull", []).length, 39);
// 36 Items: 18 Farben + 18 Rahmen (18 Raritäts-Stufen steuern die Item-Zahl).
assert("36 Kosmetik-Items", game.COSMETIC_ITEMS.length, 36);
assert("18 Farben + 18 Rahmen", game.COSMETIC_ITEMS.filter((i) => i.type === "color").length, 18);
assert("5 Erfolge", game.ACHIEVEMENTS.length, 5);
assert("Münzen = 2x Klimz + 1x Liegest", game.coinValue([{ count: 10 }], [{ count: 5 }]), 25);
// Schwellen: Lv1=0, Lv2=20, Lv3=50 -> 30 Reps sind Level 2.
assert("Level aus 30 Klimmzügen", game.levelFor([{ count: 30 }]).level, 2);
assert("Level-Name", game.levelFor([{ count: 30 }]).name, "Einsteiger");
assert("Rest bis Level 3", game.levelFor([{ count: 30 }]).remaining, 20);
assert("Maximallevel erkannt", game.levelFor([{ count: 60000 }]).next, null);
assert("Summe", game.sum([{ count: 3 }, { count: 4 }]), 7);
assert("Bester Tag", game.bestDay([{ date: "2026-09-01", count: 5 }, { date: "2026-09-01", count: 4 }, { date: "2026-09-02", count: 9 }]), 9);
assert("Momentum ohne Daten = 0", game.momentum([{ date: "2026-01-01", count: 500 }]), 0);
assert("Tages-Challenge ist aus der Liste", game.DAILY_CHALLENGES.pull.length, 8);

// Streak: heute + gestern + vorgestern (lokales Datum, wie die App es rechnet)
const d = (n) => game.todayKey(new Date(Date.now() - n * 864e5));
assert("Serie über 3 Tage", game.streak([{ date: d(0), count: 5 }, { date: d(1), count: 5 }, { date: d(2), count: 5 }]), 3);
assert("Serie bricht bei Lücke", game.streak([{ date: d(0), count: 5 }, { date: d(3), count: 5 }]), 1);

// Medaillen: 1000 Klimmzüge an einem Tag -> day_3 (Gold, 100/Tag)
const many = Array.from({ length: 10 }, () => ({ date: d(0), count: 100 }));
const medals = game.evaluateMedals("pull", many, 1, 1);
const dayGold = medals.find((m) => m.id === "day_3");
assert("Tag-Medaille Gold verdient", dayGold.earned, true);
const rankBronze = medals.find((m) => m.id === "rank_1");
assert("Platz 1 = Platin", rankBronze.earned, true);
assert("Push nutzt eigene Kategorien", game.evaluateMedals("push", [], null, null).length, 39);
assert("Push-Schwellen sind eigens", game.evaluateMedals("push", [{ date: d(0), count: 300 }])
  .find((m) => m.id === "total_3").earned, false);

// Kosmetik: Schwellen 300/800/1500/2400/... -> 1500 Reps = 3 Farben + 3 Rahmen
const items = game.withProgress(1500);
assert("6 Items bei 1500 Reps", items.filter((i) => i.earned).length, 6);
assert("4. Farbe noch gesperrt", items[3].earned, false);
assert("Fortschritt ist anteilig", items[3].progress, 1500 / 2400);
assert("Farbe 1 ist frei", items[0].earned, true);

// Wochenchart: 7 Tage
const chart = game.weekChart([{ date: d(0), count: 9 }]);
assert("Wochenchart hat 7 Tage", chart.length, 7);
assert("Heute im Chart", chart.find((c) => c.date === d(0)).count, 9);

// Rangliste
const board = game.leaderboard(
  [
    { userName: "A", date: d(0), count: 10 },
    { userName: "B", date: d(0), count: 30 },
  ],
  "pull",
);
assert("Rangliste sortiert", board[0].name, "B");
assert("Ranglisten-Woche", board[0].weeklyTotal, 30);

// ---- 1b. Verlauf & Obergrenze -------------------------------------------
assert("Obergrenze 255 Reps", MAX_REPS, 255);
assert("255 Reps = hohes Level", game.levelFor([{ count: 255 }]).level, 6);
assert("Heute in der Historie", dayLabel(game.todayKey()), "Heute");
assert(
  "Gestern in der Historie",
  dayLabel(game.todayKey(new Date(Date.now() - 864e5))),
  "Gestern",
);
const groups = groupByDay([
  { id: 1, date: "2026-09-02", count: 5 },
  { id: 2, date: "2026-09-02", count: 7 },
  { id: 3, date: "2026-09-01", count: 3 },
]);
assert("Historie gruppiert nach Tag", groups.length, 2);
assert("Zwei Einträge am selben Tag", groups[0].entries.length, 2);
assert("Tagessumme 12", groups[0].entries.reduce((a, e) => a + e.count, 0), 12);

// ---- 2. Alle Seiten rendern --------------------------------------------
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const pages = [
  ["/", "Home"],
  ["/stats", "Stats"],
  ["/ranking", "Rangliste"],
  ["/challenges", "Challenges"],
  ["/history", "Verlauf"],
  ["/avatar", "Avatar"],
  ["/quatsch", "404"],
];

// Cache füllen, damit die Seiten wirklich Inhalt rendern und nicht nur den Spinner.
const day = (n) => game.todayKey(new Date(Date.now() - n * 864e5));
const seeded = {
  "pullup-entries": [
    { id: 3, kind: "pull", count: 42, date: day(0), userName: "Markus" },
    { id: 2, kind: "pull", count: 30, date: day(1), userName: "Markus" },
    { id: 1, kind: "pull", count: 12, date: day(0), userName: "Sabine" },
  ],
  "pushup-entries": [
    { id: 2, kind: "push", count: 60, date: day(0), userName: "Markus" },
    { id: 1, kind: "push", count: 25, date: day(1), userName: "Sabine" },
  ],
  "user-collections": [
    { userName: "Markus", equippedColorId: "color_ev_1", equippedFrameId: "frame_ev_0", unlockedItemIds: ["color_ev_0", "color_ev_1"] },
  ],
  "my-entries": [
    { id: 3, kind: "pull", count: 42, date: day(0), userName: "Markus" },
    { id: 2, kind: "push", count: 60, date: day(0), userName: "Markus" },
    { id: 2, kind: "pull", count: 30, date: day(1), userName: "Markus" },
  ],
  challenges: [
    {
      id: 1, kind: "pull", title: "Blitz-Woche", description: "7 Tage, volle Power!",
      goal: 70, endDate: game.addDaysToToday(7), createdDate: day(0),
      creatorName: "Markus", participants: ["Markus", "Sabine"], emoji: "⚡",
      color: "from-yellow-400 to-orange-500",
    },
  ],
};
for (const [key, data] of Object.entries(seeded)) {
  client.setQueryData([key], data);
  client.setQueryData([key], data, { updatedAt: Date.now() });
}

store.set("pullup_username", "Markus");
store.set("pullup_session", "test-token");

for (const [path, label] of pages) {
  try {
    const html = renderToString(
      h(
        MemoryRouter,
        { initialEntries: [path] },
        h(
          QueryClientProvider,
          { client },
          h(App),
        ),
      ),
    );
    const len = html.length;
    const isSpinner = html.includes("animate-spin") && !html.includes("FitPro");
    const okLen = isSpinner ? len > 200 : len > 3000;
    console.log(`${okLen ? "ok  " : "FAIL"} render ${label} (${len} bytes)`);
    if (!okLen) process.exitCode = 1;
    for (const needle of ["undefined", "NaN", "[object Object]"]) {
      if (html.includes(needle)) {
        console.log(`FAIL ${label} enthält "${needle}"`);
        process.exitCode = 1;
      }
    }
  } catch (err) {
    console.log(`FAIL render ${label}: ${err.message}`);
    process.exitCode = 1;
  }
}

// Onboarding ohne Namen
store.delete("pullup_username");
store.delete("pullup_session");
try {
  const html = renderToString(
    h(MemoryRouter, null, h(QueryClientProvider, { client }, h(App))),
  );
  const ok = html.includes("Wie soll dich die Community nennen?");
  console.log(`${ok ? "ok  " : "FAIL"} Onboarding wird gezeigt`);
  if (!ok) process.exitCode = 1;
} catch (err) {
  console.log(`FAIL Onboarding: ${err.message}`);
  process.exitCode = 1;
}

console.log(process.exitCode ? "\nFEHLER vorhanden" : "\nAlle Prüfungen bestanden");
