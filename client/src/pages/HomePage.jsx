import { useMemo, useState } from "react";
import { useAddEntry, useDeleteEntry, useEntries, useOwnEntries } from "../lib/api";
import { RepInput } from "../components/RepInput";
import { SportToggle, SportTotals, StatTiles } from "../components/Tiles";
import { BadgeStrip, WeekChart } from "../components/Charts";
import { DailyChallenge, LevelCard, MomentumCard } from "../components/HomeCards";
import { RecentEntries } from "../components/EntryList";
import { Spinner } from "../components/ui";
import {
  MEDAL_CATEGORIES,
  UNIT,
  evaluateMedals,
  levelFor,
  momentum,
  rankOf,
  streak,
  sum,
  todayTotal,
  weekChart,
  weekTotal,
} from "../lib/game";

export default function HomePage({ userName }) {
  const [kind, setKind] = useState("pull");
  const { data: pullEntries = [], isFirstLoad: loadingPull } = useEntries("pull");
  const { data: pushEntries = [], isFirstLoad: loadingPush } = useEntries("push");
  const { data: ownEntries = [] } = useOwnEntries();
  const addEntry = useAddEntry(kind);
  const deleteEntry = useDeleteEntry();

  const myPull = useMemo(
    () => pullEntries.filter((e) => e.userName === userName),
    [pullEntries, userName],
  );
  const myPush = useMemo(
    () => pushEntries.filter((e) => e.userName === userName),
    [pushEntries, userName],
  );

  const isPull = kind === "pull";
  const mine = isPull ? myPull : myPush;

  const today = todayTotal(mine);
  const weekly = weekTotal(mine);
  const level = levelFor(mine);
  const weekData = weekChart(mine);

  // Klimmzüge bestimmen Level und Platz in der Rangliste.
  const ranks = useMemo(
    () => (isPull ? rankOf(pullEntries, userName) : { weeklyRank: null, allTimeRank: null }),
    [isPull, pullEntries, userName],
  );
  const medals = useMemo(
    () => evaluateMedals(kind, mine, ranks.weeklyRank, ranks.allTimeRank),
    [kind, mine, ranks],
  );

  const remove = (entry) => {
    if (window.confirm(`Eintrag über ${entry.count} wirklich löschen?`)) {
      deleteEntry.mutate(entry.id);
    }
  };

  if (loadingPull || loadingPush) return <Spinner />;

  return (
    <div className="space-y-4">
      <SportTotals pullTotal={sum(myPull)} pushTotal={sum(myPush)} />

      <SportToggle value={kind} onChange={setKind} />

      <StatTiles
        today={today}
        weekly={weekly}
        streakDays={streak(mine)}
        total={sum(mine)}
      />

      <RepInput
        onAdd={(count) => addEntry.mutateAsync({ count })}
        isAdding={addEntry.isPending}
        label={UNIT[kind].entry}
        unit={UNIT[kind].plural}
      />

      <RecentEntries
        entries={ownEntries}
        onDelete={remove}
        deleting={deleteEntry.isPending}
      />

      <MomentumCard value={momentum(mine)} />
      <DailyChallenge kind={kind} todayTotal={today} />
      <LevelCard level={level} />
      <WeekChart data={weekData} />
      <BadgeStrip badges={medals} categories={MEDAL_CATEGORIES[kind]} />

      <p className="text-center text-xs text-muted-foreground">
        {sum(myPull)} Klimmzüge und {sum(myPush)} Liegestützen gesamt
        {isPull && ranks.weeklyRank
          ? ` · Platz ${ranks.weeklyRank} diese Woche, Platz ${ranks.allTimeRank} insgesamt`
          : null}
      </p>
    </div>
  );
}
