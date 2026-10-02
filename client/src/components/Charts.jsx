import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";

/** Wochenbalken auf der Startseite. */
export function WeekChart({ data }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
      <h3 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wider">
        Diese Woche
      </h3>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={28}>
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            />
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))" }}
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
                fontSize: "13px",
              }}
              formatter={(value) => [`${value} Klimmzüge`, ""]}
            />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Abzeichen-Übersicht. Ohne Medal-Definitionen (push) zeigt es nur die Icons.
 * Bei vorhandenen Kategorien werden Medaillen mit Fortschrittsbalken aufgeführt.
 */
export function BadgeStrip({ badges, categories }) {
  if (categories) {
    return (
      <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Abzeichen</p>
          <Link
            to="/stats"
            className="text-xs text-primary font-medium flex items-center gap-0.5 hover:underline"
          >
            Alle <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="space-y-2">
          {categories.map((category) => {
            const reachedIndex = category.tiers.reduce((acc, tier, index) => {
              const badge = badges.find((b) => b.id === tier.id);
              return badge?.earned ? index : acc;
            }, -1);

            return (
              <div key={category.id} className="flex items-center gap-2">
                <span className="text-base w-5 shrink-0">{category.icon}</span>
                <p className="text-xs text-muted-foreground w-20 shrink-0 truncate">{category.label}</p>
                <div className="flex items-center gap-1 flex-1">
                  {category.tiers.map((tier, index) => (
                    <span
                      key={tier.id}
                      title={tier.name}
                      className={`text-lg leading-none transition-all ${
                        index <= reachedIndex ? "" : "grayscale opacity-25"
                      }`}
                    >
                      {tier.medal}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const earned = badges.filter((b) => b.earned);
  if (!earned.length) return null;

  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Abzeichen</p>
        <Link
          to="/stats"
          className="text-xs text-primary font-medium flex items-center gap-0.5 hover:underline"
        >
          Alle <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {earned.slice(0, 8).map((badge) => (
          <span
            key={badge.id}
            className={`text-xl ${badge.earned ? "" : "grayscale opacity-30"}`}
          >
            {badge.icon}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Klappbare Karte für einen Medaillen-Satz. */
export function MedalCategory({ category, badges }) {
  const reachedIndex = category.tiers.reduce((acc, tier, index) => {
    const badge = badges.find((b) => b.id === tier.id);
    return badge?.earned ? index : acc;
  }, -1);
  const nextTier = category.tiers[reachedIndex + 1];
  const nextBadge = nextTier ? badges.find((b) => b.id === nextTier.id) : null;
  const done = reachedIndex === category.tiers.length - 1;

  return (
    <div className="bg-card rounded-2xl border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{category.icon}</span>
        <p className="font-semibold text-sm">{category.label}</p>
        <span className="ml-auto text-xs text-muted-foreground">
          {reachedIndex + 1}/{category.tiers.length}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        {category.tiers.map((tier, index) => (
          <div key={tier.id} className="flex flex-col items-center gap-0.5 flex-1">
            <span
              className={`text-2xl transition-all ${index <= reachedIndex ? "" : "grayscale opacity-30"}`}
            >
              {tier.medal}
            </span>
            <span
              className={`text-[9px] text-center leading-tight ${
                index <= reachedIndex ? "text-foreground font-medium" : "text-muted-foreground"
              }`}
            >
              {tier.name}
            </span>
          </div>
        ))}
      </div>

      {nextBadge && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{nextTier.desc}</span>
            <span className="font-medium text-primary">{Math.round(nextBadge.progress * 100)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${nextBadge.progress * 100}%` }}
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
            />
          </div>
        </div>
      )}

      {done && <p className="text-xs text-primary font-semibold text-center">✓ Alle Stufen erreicht!</p>}
    </div>
  );
}
