/**
 * Spiellogik – 1:1 aus der Original-App übernommen.
 * Alle Kennzahlen (Level, Abzeichen, Momentum, Seltenheiten) sind hier gebündelt,
 * damit die Seiten nur noch rendern müssen.
 */
import {
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  getISOWeek,
  isWithinInterval,
  parseISO,
  startOfISOWeek,
  startOfWeek,
  subDays,
  subWeeks,
} from "date-fns";
import { de } from "date-fns/locale";

import data from "../data/game-data.json";

export const LOCALE = de;
export const SEASON_EPOCH = new Date("2026-01-01");

export const LEVELS = data.pullLevels;

export const MEDAL_CATEGORIES = { pull: data.pullMedals, push: data.pushMedals };
export const CHALLENGE_TEMPLATES = { pull: data.pullTemplates, push: data.pushTemplates };
export const DAILY_CHALLENGES = { pull: data.pullDaily, push: data.pushDaily };

export const RARITY_ORDER = ["common", "rare", "epic", "legendary", "mythic"];
export const RARITY_LABEL = {
  common: "Gewöhnlich",
  rare: "Selten",
  epic: "Episch",
  legendary: "Legendär",
  mythic: "Mythisch",
};

export const UNIT = {
  pull: { plural: "Klimmzüge", coin: "Diamanten", entry: "Klimmzüge eintragen", icon: "💎" },
  push: { plural: "Liegestützen", coin: "Münzen", entry: "Liegestützen eintragen", icon: "🪙" },
};

export const todayKey = (date = new Date()) => format(date, "yyyy-MM-dd");

// ---------------------------------------------------------------- Season --
export function currentSeason() {
  const now = new Date();
  const number = Math.max(
    1,
    (now.getFullYear() - SEASON_EPOCH.getFullYear()) * 12 +
      (now.getMonth() - SEASON_EPOCH.getMonth()) +
      1,
  );
  return {
    number,
    name: `Season ${number}`,
    monthLabel: format(now, "MMMM yyyy", { locale: LOCALE }),
  };
}

// ------------------------------------------------------------ Kosmetik ---
const buildItems = (type, list) =>
  data.rarityThresholds.map((tier, index) => ({
    id: `${type}_ev_${index}`,
    type,
    name: list[index].name,
    value: list[index].value,
    emoji: list[index].emoji,
    rarity: tier.rarity,
    threshold: tier.threshold,
    limited: false,
  }));

export const COSMETIC_ITEMS = [
  ...buildItems("color", data.colors),
  ...buildItems("frame", data.frames),
];

export const ACHIEVEMENTS = data.achievements;

export function findItem(id) {
  if (!id) return null;
  return (
    ACHIEVEMENTS.find((a) => a.id === id) ||
    COSMETIC_ITEMS.find((i) => i.id === id) ||
    null
  );
}

/** Münzen = 2 × Klimmzüge + 1 × Liegestützen */
export function coinValue(pullEntries, pushEntries) {
  const sum = (list) => list.reduce((acc, e) => acc + (e.count || 0), 0);
  return sum(pullEntries) * 2 + sum(pushEntries);
}

export function withProgress(coinCount) {
  return COSMETIC_ITEMS.map((item) => ({
    ...item,
    earned: coinCount >= item.threshold,
    progress: Math.min(coinCount / item.threshold, 1),
  }));
}

export function evaluateAchievements(allPullEntries, userName) {
  const mine = allPullEntries.filter((e) => e.userName === userName);
  const byDay = {};
  mine.forEach((e) => {
    byDay[e.date] = (byDay[e.date] || 0) + (e.count || 0);
  });

  const bestDay = Object.values(byDay).reduce((a, b) => Math.max(a, b), 0);

  let bestWeek = 0;
  const weekKeys = [
    ...new Set(mine.map((e) => format(startOfISOWeek(parseISO(e.date)), "yyyy-MM-dd"))),
  ];
  weekKeys.forEach((key) => {
    const start = new Date(key);
    const total = mine
      .filter((e) => isWithinInterval(parseISO(e.date), { start, end: addWeeks(start, 1) }))
      .reduce((acc, e) => acc + (e.count || 0), 0);
    if (total > bestWeek) bestWeek = total;
  });

  let isWeeklyWinner = false;
  const allWeekKeys = [
    ...new Set(
      allPullEntries.map((e) => format(startOfISOWeek(parseISO(e.date)), "yyyy-MM-dd")),
    ),
  ];
  allWeekKeys.forEach((key) => {
    const start = new Date(key);
    const totals = {};
    allPullEntries
      .filter((e) => isWithinInterval(parseISO(e.date), { start, end: addWeeks(start, 1) }))
      .forEach((e) => {
        const who = e.userName || "Anonym";
        totals[who] = (totals[who] || 0) + (e.count || 0);
      });
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    if (sorted.length && sorted[0][0] === userName && sorted[0][1] > 0) isWeeklyWinner = true;
  });

  return ACHIEVEMENTS.map((a) => {
    let earned;
    let progress;
    let current = 0;
    if (a.category === "rank1") {
      earned = isWeeklyWinner;
      progress = earned ? 1 : 0;
    } else if (a.category === "day") {
      current = bestDay;
      earned = bestDay >= a.threshold;
      progress = Math.min(bestDay / a.threshold, 1);
    } else {
      current = bestWeek;
      earned = bestWeek >= a.threshold;
      progress = Math.min(bestWeek / a.threshold, 1);
    }
    return { ...a, earned, progress, current, achievement: true, limited: false };
  });
}

// ------------------------------------------------------------- Kennzahlen -
export const sum = (list) => list.reduce((acc, e) => acc + (e.count || 0), 0);

export const todayTotal = (entries) =>
  entries.filter((e) => e.date === todayKey()).reduce((acc, e) => acc + (e.count || 0), 0);

export function bestDay(entries) {
  const byDay = {};
  entries.forEach((e) => {
    byDay[e.date] = (byDay[e.date] || 0) + (e.count || 0);
  });
  return Object.values(byDay).reduce((a, b) => Math.max(a, b), 0);
}

export function bestWeek(entries) {
  const byWeek = {};
  entries.forEach((e) => {
    const key = format(startOfISOWeek(parseISO(e.date)), "yyyy-MM-dd");
    byWeek[key] = (byWeek[key] || 0) + (e.count || 0);
  });
  return Object.values(byWeek).reduce((a, b) => Math.max(a, b), 0);
}

export function weekTotal(entries, weekOffset = 0) {
  const { start, end } = weekRange(weekOffset);
  return entries
    .filter((e) => isWithinInterval(parseISO(e.date), { start, end }))
    .reduce((acc, e) => acc + (e.count || 0), 0);
}

export function weekRange(weekOffset = 0) {
  const start = startOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  return { start, end: endOfWeek(start, { weekStartsOn: 1 }) };
}

export function currentWeekRange() {
  return weekRange(0);
}

export function weekChart(entries, weekOffset = 0) {
  const { start, end } = weekRange(weekOffset);
  return eachDayOfInterval({ start, end }).map((day) => {
    const key = format(day, "yyyy-MM-dd");
    return {
      day: format(day, "EEE", { locale: LOCALE }),
      date: key,
      count: entries.filter((e) => e.date === key).reduce((acc, e) => acc + (e.count || 0), 0),
    };
  });
}

export function weeklyTotals(entries, weeks = 8) {
  const out = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const { start, end } = weekRange(i);
    const total = entries
      .filter((e) => isWithinInterval(parseISO(e.date), { start, end }))
      .reduce((acc, e) => acc + (e.count || 0), 0);
    out.push({ week: `KW ${getISOWeek(start)}`, total });
  }
  return out;
}

export function dailyCounts(entries) {
  const byDay = {};
  entries.forEach((e) => {
    byDay[e.date] = (byDay[e.date] || 0) + (e.count || 0);
  });
  return Object.values(byDay);
}

export function averageDay(entries) {
  const values = dailyCounts(entries).filter((v) => v > 0);
  return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
}

export function averageWeek(entries, weeks = 12) {
  const values = weeklyTotals(entries, weeks).map((w) => w.total).filter((v) => v > 0);
  return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
}

/** Serie: aufeinanderfolgende Tage mit mindestens einem Eintrag. */
export function streak(entries) {
  if (!entries.length) return 0;
  const days = [...new Set(entries.map((e) => e.date))].sort().reverse();
  let count = 0;
  let cursor = new Date();
  for (let i = 0; i < days.length; i++) {
    const key = todayKey(cursor);
    if (days.includes(key)) {
      count++;
      cursor = subDays(cursor, 1);
    } else if (i === 0) {
      cursor = subDays(cursor, 1);
      if (days.includes(todayKey(cursor))) {
        count++;
        cursor = subDays(cursor, 1);
      } else break;
    } else break;
  }
  return count;
}

const MOMENTUM_GOAL = 40;

/** Momentum: 0-100, verblasst halb so schnell, wie es aufgebaut wird. */
export function momentum(entries, days = 30) {
  const byDay = {};
  entries.forEach((e) => {
    byDay[e.date] = (byDay[e.date] || 0) + (e.count || 0);
  });
  let value = 0;
  for (let i = days - 1; i >= 0; i--) {
    const key = todayKey(subDays(new Date(), i));
    const count = byDay[key] || 0;
    if (count > 0) {
      const intensity = Math.min(count / MOMENTUM_GOAL, 1);
      value += (100 - value) * 0.12 * intensity;
    } else {
      value *= 0.5;
    }
  }
  return Math.round(value);
}

export function levelFor(entries) {
  const total = sum(entries);
  let current = LEVELS[0];
  let next = null;
  for (let i = 0; i < LEVELS.length && total >= LEVELS[i].threshold; i++) {
    current = LEVELS[i];
    next = LEVELS[i + 1] || null;
  }
  if (!next) {
    return { level: current.level, name: current.name, next: null, progress: 1, total, remaining: 0 };
  }
  const span = next.threshold - current.threshold;
  return {
    level: current.level,
    name: current.name,
    next: next.threshold,
    progress: Math.min((total - current.threshold) / span, 1),
    total,
    remaining: next.threshold - total,
  };
}

export function rankOf(allEntries, userName) {
  if (!userName) return { weeklyRank: null, allTimeRank: null };
  const totals = {};
  allEntries.forEach((e) => {
    const who = e.userName || "Anonym";
    totals[who] = totals[who] || { allTime: 0, entries: [] };
    totals[who].allTime += e.count || 0;
    totals[who].entries.push(e);
  });
  Object.keys(totals).forEach((who) => {
    totals[who].weekly = weekTotal(totals[who].entries);
  });
  const weekly = Object.entries(totals).sort((a, b) => b[1].weekly - a[1].weekly);
  const allTime = Object.entries(totals).sort((a, b) => b[1].allTime - a[1].allTime);
  return {
    weeklyRank: weekly.findIndex(([who]) => who === userName) + 1 || null,
    allTimeRank: allTime.findIndex(([who]) => who === userName) + 1 || null,
  };
}

// ------------------------------------------------------------- Abzeichen -
export function evaluateMedals(kind, entries, weeklyRank = null, allTimeRank = null) {
  const total = sum(entries);
  const currentStreak = streak(entries);
  const weekly = weekTotal(entries);
  const bestDayCount = bestDay(entries);
  const sessions = entries.length;

  const activeWeeks = new Set(
    entries.map((e) => format(startOfISOWeek(parseISO(e.date)), "yyyy-MM-dd")),
  ).size;

  const daysByWeek = {};
  entries.forEach((e) => {
    const key = format(startOfISOWeek(parseISO(e.date)), "yyyy-MM-dd");
    (daysByWeek[key] ||= new Set()).add(e.date);
  });
  const perfectWeeks = Object.values(daysByWeek).filter((set) => set.size >= 7).length;

  return MEDAL_CATEGORIES[kind].flatMap((category) =>
    category.tiers.map((tier) => {
      let current;
      switch (category.type) {
        case "streak":
          current = currentStreak;
          break;
        case "day":
          current = bestDayCount;
          break;
        case "weekly":
          current = weekly;
          break;
        case "rank":
          current = weeklyRank !== null ? weeklyRank : Infinity;
          break;
        case "rank_alltime":
          current = allTimeRank !== null ? allTimeRank : Infinity;
          break;
        case "consistency":
          current = activeWeeks;
          break;
        case "sessions":
          current = sessions;
          break;
        case "perfect_weeks":
          current = perfectWeeks;
          break;
        default:
          current = total;
      }
      const isRank = category.type === "rank" || category.type === "rank_alltime";
      const earned = isRank ? current <= tier.threshold : current >= tier.threshold;
      const progress = isRank ? (earned ? 1 : 0) : Math.min(current / tier.threshold, 1);
      return { ...tier, type: category.type, icon: category.icon, earned, progress, current };
    }),
  );
}

export function rank1For(entries, userName) {
  return evaluateAchievements(entries, userName).find((a) => a.category === "rank1")?.earned;
}

// -------------------------------------------------------- Tages-Challenge -
export function pickDailyChallenge(list) {
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 864e5);
  return list[dayOfYear % list.length];
}

// ------------------------------------------------------------ Rangliste ---
export function leaderboard(entries, kind) {
  const byUser = {};
  entries.forEach((e) => {
    const who = e.userName || "Anonym";
    (byUser[who] ||= { name: who, entries: [] }).entries.push(e);
  });
  return Object.values(byUser)
    .map((user) => ({
      ...user,
      weeklyTotal: weekTotal(user.entries),
      allTimeTotal: sum(user.entries),
      momentum: momentum(user.entries),
    }))
    .filter((user) => user.weeklyTotal > 0)
    .sort((a, b) => b.weeklyTotal - a.weeklyTotal);
}

export function addDaysToToday(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysUntil(date) {
  return Math.ceil((new Date(date) - new Date()) / 864e5);
}

export function isPast(date) {
  return new Date(date) < new Date();
}
