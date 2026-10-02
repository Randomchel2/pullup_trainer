import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";

import { useEntries } from "../lib/api";
import { MedalCategory } from "../components/Charts";
import { Progress, Spinner } from "../components/ui";
import {
  LOCALE,
  MEDAL_CATEGORIES,
  averageDay,
  averageWeek,
  bestDay,
  bestWeek,
  evaluateMedals,
  levelFor,
  rankOf,
  sum,
  weekChart,
  weekRange,
  weekTotal,
} from "../lib/game";

function MetricCard({ tone, label, value, caption }) {
  const tones = {
    blue: "bg-blue-50 dark:bg-blue-950/30 text-blue-600",
    amber: "bg-amber-50 dark:bg-amber-950/30 text-amber-700",
  };
  const captionTone =
    tone === "blue" ? "text-blue-600/70" : "text-amber-700/70";

  return (
    <div className={`${tones[tone]} rounded-xl p-2.5 text-center`}>
      <p className="text-xl font-heading font-bold">{value}</p>
      <p className={`text-[10px] ${captionTone}`}>{caption}</p>
    </div>
  );
}

function SmallStat({ value, label }) {
  return (
    <div className="bg-muted/50 rounded-lg p-2 text-center">
      <p className="text-sm font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

export default function StatsPage({ userName }) {
  const [weekOffset, setWeekOffset] = useState(0);

  const { data: pullEntries = [], isFirstLoad: loadingPull } = useEntries("pull");
  const { data: pushEntries = [], isFirstLoad: loadingPush } = useEntries("push");

  const myPull = useMemo(
    () => pullEntries.filter((e) => e.userName === userName),
    [pullEntries, userName],
  );
  const myPush = useMemo(
    () => pushEntries.filter((e) => e.userName === userName),
    [pushEntries, userName],
  );

  const ranks = useMemo(() => rankOf(pullEntries, userName), [pullEntries, userName]);
  const medals = useMemo(
    () => evaluateMedals("pull", myPull, ranks.weeklyRank, ranks.allTimeRank),
    [myPull, ranks],
  );
  const earnedCount = medals.filter((m) => m.earned).length;
  const level = useMemo(() => levelFor(myPull), [myPull]);

  const range = weekRange(weekOffset);
  const rangeLabel =
    weekOffset === 0
      ? "Diese Woche"
      : weekOffset === 1
        ? "Letzte Woche"
        : `${format(range.start, "d. MMM", { locale: LOCALE })} – ${format(range.end, "d. MMM", { locale: LOCALE })}`;

  const chartData = useMemo(() => {
    const pullWeek = weekChart(myPull, weekOffset);
    const pushWeek = weekChart(myPush, weekOffset);
    return pullWeek.map((day, i) => ({
      day: day.day,
      Klimmzüge: day.count,
      Liegestützen: pushWeek[i]?.count || 0,
    }));
  }, [myPull, myPush, weekOffset]);

  if (loadingPull || loadingPush) return <Spinner />;

  return (
    <div className="space-y-5">
      <h1 className="font-heading text-2xl font-bold">Statistiken</h1>

      {/* Diamanten / Münzen */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 bg-white/30 rounded-xl flex items-center justify-center text-xl shrink-0">💎</div>
          <div>
            <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Diamanten</p>
            <p className="text-2xl font-heading font-bold text-white leading-none">{sum(myPull)}</p>
            <p className="text-[10px] text-white/60">= Klimmzüge</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-400 to-yellow-300 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 bg-white/40 rounded-xl flex items-center justify-center text-xl shrink-0">🪙</div>
          <div>
            <p className="text-[10px] font-bold text-amber-900/70 uppercase tracking-wider">Münzen</p>
            <p className="text-2xl font-heading font-bold text-amber-900 leading-none">{sum(myPush)}</p>
            <p className="text-[10px] text-amber-900/60">= Liegestützen</p>
          </div>
        </div>
      </div>

      {/* Gesamt & Durchschnitt */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Gesamt & Durchschnitt
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              tone: "blue",
              icon: "💎",
              label: "Klimmzüge",
              total: sum(myPull),
              avgDay: averageDay(myPull),
              avgWeek: averageWeek(myPull),
            },
            {
              tone: "amber",
              icon: "🪙",
              label: "Liegestützen",
              total: sum(myPush),
              avgDay: averageDay(myPush),
              avgWeek: averageWeek(myPush),
            },
          ].map((col) => (
            <div key={col.label} className="space-y-1">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">{col.icon}</span>
                <span
                  className={`text-xs font-bold ${
                    col.tone === "blue" ? "text-blue-600" : "text-amber-700"
                  }`}
                >
                  {col.label}
                </span>
              </div>
              <MetricCard tone={col.tone} value={col.total} caption="Gesamt" />
              <div className="grid grid-cols-2 gap-1">
                <SmallStat value={col.avgDay} label="Ø Tag" />
                <SmallStat value={col.avgWeek} label="Ø Woche" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rekorde */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rekorde</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              tone: "blue",
              icon: "💎",
              label: "Klimmzüge",
              day: bestDay(myPull),
              week: bestWeek(myPull),
            },
            {
              tone: "amber",
              icon: "🪙",
              label: "Liegestützen",
              day: bestDay(myPush),
              week: bestWeek(myPush),
            },
          ].map((col) => (
            <div key={col.label} className="space-y-2">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-sm">{col.icon}</span>
                <span
                  className={`text-xs font-bold ${
                    col.tone === "blue" ? "text-blue-600" : "text-amber-700"
                  }`}
                >
                  {col.label}
                </span>
              </div>
              <MetricCard tone={col.tone} value={col.day} caption="Bester Tag" />
              <MetricCard tone={col.tone} value={col.week} caption="Beste Woche" />
            </div>
          ))}
        </div>
      </div>

      {/* Wochenchart */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setWeekOffset((v) => v + 1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold">{rangeLabel}</p>
            <p className="text-[10px] text-muted-foreground">
              💎 {weekTotal(myPull, weekOffset)} · 🪙 {weekTotal(myPush, weekOffset)}
            </p>
          </div>
          <button
            onClick={() => setWeekOffset((v) => Math.max(0, v - 1))}
            disabled={weekOffset === 0}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={10} barGap={2}>
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="Klimmzüge" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Liegestützen" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-blue-500" />
            <span>💎 Klimmzüge</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-amber-400" />
            <span>🪙 Liegestützen</span>
          </div>
        </div>
      </div>

      {/* Level + Abzeichen-Count */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <p className="text-3xl font-heading font-bold">Lv. {level.level}</p>
          <p className="text-xs text-muted-foreground mt-1">{level.name}</p>
          {level.next && (
            <div className="mt-2">
              <Progress value={level.progress * 100} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground mt-1">
                {level.remaining} bis Lv. {level.level + 1}
              </p>
            </div>
          )}
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <p className="text-3xl font-heading font-bold">{earnedCount}</p>
          <p className="text-xs text-muted-foreground mt-1">von {medals.length} Abzeichen</p>
          <div className="flex flex-wrap justify-center gap-0.5 mt-2">
            {medals
              .filter((m) => m.earned)
              .slice(0, 6)
              .map((m) => (
                <span key={m.id} className="text-base">
                  {m.medal}
                </span>
              ))}
          </div>
        </div>
      </div>

      {/* Alle Medaillen-Kategorien */}
      <div className="space-y-3">
        <h3 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wider px-1">
          Abzeichen (Klimmzüge)
        </h3>
        {MEDAL_CATEGORIES.pull.map((category) => (
          <MedalCategory key={category.id} category={category} badges={medals} />
        ))}
      </div>
    </div>
  );
}
