import { useMemo, useState } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Flame, Trophy } from "lucide-react";

import { useEntries, useUserCollections } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { SportToggle } from "../components/Tiles";
import { Spinner } from "../components/ui";
import { LOCALE, UNIT, currentWeekRange, leaderboard } from "../lib/game";

const MEDALS = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

export default function RankingPage({ userName }) {
  const [kind, setKind] = useState("pull");
  const { data: pullEntries = [], isFirstLoad: loadingPull } = useEntries("pull");
  const { data: pushEntries = [], isFirstLoad: loadingPush } = useEntries("push");
  const { data: collections = [] } = useUserCollections();

  const range = currentWeekRange();
  const rows = useMemo(
    () => leaderboard(kind === "pull" ? pullEntries : pushEntries, kind),
    [kind, pullEntries, pushEntries],
  );

  const collectionFor = (name) => collections.find((c) => c.userName === name) || null;
  const unit = UNIT[kind];

  if (loadingPull || loadingPush) return <Spinner />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold">Rangliste</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {format(range.start, "d. MMM", { locale: LOCALE })} –{" "}
          {format(range.end, "d. MMM yyyy", { locale: LOCALE })} · Nur aktive Teilnehmer
        </p>
      </div>

      <SportToggle value={kind} onChange={setKind} />

      {rows.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <Trophy className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">
            Diese Woche noch keine {unit.plural}. Sei der Erste!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row, index) => {
            const isMe = row.name === userName;
            const collection = collectionFor(row.name);
            return (
              <motion.div
                key={row.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                  isMe ? "bg-primary/5 border-primary/30" : "bg-card border-border"
                }`}
              >
                <div className="w-5 text-center shrink-0 text-base font-bold text-muted-foreground">
                  {index < MEDALS.length ? MEDALS[index] : index + 1}
                </div>

                <Avatar
                  userName={row.name}
                  size="sm"
                  equippedColorId={collection?.equippedColorId}
                  equippedFrameId={collection?.equippedFrameId}
                />

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {row.name}{" "}
                    {isMe && <span className="text-primary text-xs">(Du)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {unit.icon} {row.allTimeTotal} {unit.coin} gesamt
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Flame className="w-3 h-3 text-primary shrink-0" />
                    <div className="h-1.5 flex-1 max-w-[80px] bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                        style={{ width: `${row.momentum}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{row.momentum}%</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xl font-heading font-bold text-primary">{row.weeklyTotal}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">diese Woche</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
