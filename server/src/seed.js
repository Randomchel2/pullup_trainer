/**
 * Erzeugt Demo-Daten, damit Ranking, Abzeichen und Avatare etwas zu zeigen haben.
 * Aufruf: npm run seed   (im Ordner server)
 *
 * Alle Werte bleiben bewusst unter MAX_REPS (255) – der Seed bricht sonst
 * absichtlich ab, statt still Daten außerhalb des erlaubten Bereichs zu legen.
 */
import { MAX_REPS, createChallenge, createEntry, resetAll, upsertUserCollection } from "./db.js";

/** Linearer Aufbau von `from` nach `to` über `n` Tage. */
const ramp = (from, to, n) =>
  Array.from({ length: n }, (_, i) => Math.round(from + ((to - from) * i) / (n - 1)));

const PEOPLE = [
  // richtig trainieren: 12 → 240 Klimmzüge in 60 Tagen
  { name: "Markus", pull: ramp(12, 240, 60), push: 90, skip: 0.05 },
  { name: "Jonas", pull: ramp(20, 120, 30), push: 70, skip: 0.1 },
  { name: "Tobias", pull: ramp(15, 90, 25), push: 60, skip: 0.12 },
  { name: "Sabine", pull: ramp(8, 40, 20), push: 80, skip: 0.15 },
  { name: "Lena", pull: ramp(5, 30, 15), push: 40, skip: 0.2 },
];

const iso = (d) => d.toISOString().slice(0, 10);

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

resetAll();

let created = 0;
for (const person of PEOPLE) {
  const total = person.pull.length;

  // Klimmzüge: aufsteigend, ältester Eintrag zuerst
  for (let i = 0; i < total; i++) {
    if (Math.random() < person.skip) continue;
    createEntry("pull", person.name, {
      count: person.pull[i],
      date: iso(daysAgo(total - 1 - i)),
    });
    created++;
  }

  // Liegestützen: täglich, mit Schwankung
  for (let back = 29; back >= 0; back--) {
    if (Math.random() < 0.3) continue;
    const count = Math.round(person.push / 7) + Math.round(Math.random() * 25);
    if (count > MAX_REPS) throw new Error(`Seed übertritt ${MAX_REPS}: ${count}`);
    createEntry("push", person.name, { count, date: iso(daysAgo(back)) });
    created++;
  }
}

upsertUserCollection("Markus", {
  equippedColorId: "color_ev_5",
  equippedFrameId: "frame_ev_4",
  unlockedItemIds: [
    ...Array.from({ length: 6 }, (_, i) => `color_ev_${i}`),
    ...Array.from({ length: 5 }, (_, i) => `frame_ev_${i}`),
  ],
});

const inDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return iso(d);
};

createChallenge("pull", "Markus", {
  title: "Blitz-Woche",
  description: "7 Tage, volle Power!",
  goal: 70,
  endDate: inDays(7),
  participants: ["Markus", "Jonas", "Tobias"],
  emoji: "⚡",
  color: "from-yellow-400 to-orange-500",
});
createChallenge("pull", "Sabine", {
  title: "30-Tage-Inferno",
  description: "Ein Monat Schmerz. Ein Leben Stolz.",
  goal: 300,
  endDate: inDays(30),
  participants: ["Sabine", "Markus"],
  emoji: "🔥",
  color: "from-orange-500 to-red-600",
});
createChallenge("pull", "Jonas", {
  title: "König der Stange",
  description: "Wer schafft die meisten in 2 Wochen?",
  goal: 150,
  endDate: inDays(-1),
  participants: ["Jonas", "Tobias", "Markus"],
  emoji: "👑",
  color: "from-amber-400 to-yellow-500",
});
createChallenge("push", "Lena", {
  title: "Iron Week",
  description: "Täglich 15 – niemals aufgeben!",
  goal: 75,
  endDate: inDays(7),
  participants: ["Lena", "Sabine"],
  emoji: "💪",
  color: "from-blue-500 to-indigo-600",
});

console.log(`Demo-Daten angelegt: ${created} Einträge, ${PEOPLE.length} Sportler.`);
console.log(`Melde dich z.B. als "Markus" an, um Fortschritt zu sehen.`);
