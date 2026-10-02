import { AnimatePresence, motion } from "framer-motion";
import { Check, Flame, Zap } from "lucide-react";
import { DAILY_CHALLENGES, pickDailyChallenge } from "../lib/game";
import { useDailyDone } from "../lib/storage";
import { Progress } from "./ui";

/** Tages-Challenge: eine Aufgabe pro Tag, aus einer festen Liste. */
export function DailyChallenge({ kind, todayTotal }) {
  const challenge = pickDailyChallenge(DAILY_CHALLENGES[kind]);
  const hasTarget = challenge.target !== null;
  const progress = hasTarget ? Math.min((todayTotal / challenge.target) * 100, 100) : null;
  const reached = hasTarget && todayTotal >= challenge.target;

  const [done, markDone] = useDailyDone(kind, reached);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border overflow-hidden transition-all ${
        done
          ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
          : "bg-card border-border"
      }`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                done ? "bg-green-100 dark:bg-green-900/40" : "bg-primary/10"
              }`}
            >
              {done ? "✅" : challenge.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Tages-Challenge
                </p>
                <Zap className="w-3 h-3 text-primary" />
              </div>
              <p
                className={`text-sm font-semibold leading-snug ${
                  done ? "line-through text-muted-foreground" : ""
                }`}
              >
                {challenge.text}
              </p>
              {hasTarget && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {todayTotal} / {challenge.target} heute
                </p>
              )}
            </div>
          </div>

          {!done && !hasTarget && (
            <button
              onClick={markDone}
              className="shrink-0 w-8 h-8 rounded-full border-2 border-muted-foreground/30 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950/30 transition-all flex items-center justify-center"
            >
              <Check className="w-4 h-4 text-muted-foreground/50" />
            </button>
          )}
          {done && <Check className="w-6 h-6 text-green-500 shrink-0 mt-2" />}
        </div>

        {hasTarget && !done && progress !== null && (
          <div className="mt-3">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
              />
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-3"
          >
            <p className="text-xs font-semibold text-green-600 dark:text-green-400">
              🎉 Challenge erledigt! Komm morgen wieder!
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function MomentumCard({ value }) {
  const gradient =
    value >= 70
      ? "from-primary to-accent"
      : value >= 35
        ? "from-amber-400 to-orange-400"
        : "from-slate-400 to-slate-500";

  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-primary" />
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Momentum</p>
        </div>
        <span className="text-sm font-heading font-bold">{value}%</span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full bg-gradient-to-r ${gradient} rounded-full`}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Bleib aktiv, sonst sinkt dein Momentum schnell wieder!
      </p>
    </div>
  );
}

export function LevelCard({ level }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Dein Level</p>
          <p className="font-heading text-xl font-bold mt-0.5">
            Level {level.level} – {level.name}
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <span className="text-2xl font-heading font-black text-primary">{level.level}</span>
        </div>
      </div>

      {level.next ? (
        <div className="space-y-1.5">
          <Progress value={level.progress * 100} className="h-2.5" />
          <p className="text-xs text-muted-foreground">
            Noch {level.remaining} Klimmzüge bis Level {level.level + 1}
          </p>
        </div>
      ) : (
        <p className="text-sm text-primary font-semibold">
          🏆 Maximales Level erreicht – du bist eine Legende!
        </p>
      )}
    </div>
  );
}
