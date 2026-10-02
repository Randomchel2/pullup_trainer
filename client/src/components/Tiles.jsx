import { motion } from "framer-motion";
import { BarChart3, CalendarDays, Flame, Trophy } from "lucide-react";

export function StatTiles({ today, weekly, streakDays, total }) {
  const tiles = [
    { label: "Heute", value: today, Icon: Flame, color: "text-primary" },
    { label: "Diese Woche", value: weekly, Icon: CalendarDays, color: "text-accent" },
    { label: "Gesamt", value: total, Icon: BarChart3, color: "text-chart-3" },
    { label: "Serie", value: `${streakDays}d`, Icon: Trophy, color: "text-chart-4" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {tiles.map(({ label, value, Icon, color }) => (
        <div key={label} className="bg-card rounded-2xl border border-border p-4 text-center space-y-1">
          <Icon className={`w-5 h-5 mx-auto ${color}`} />
          <p className="text-2xl font-heading font-bold">{value}</p>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
        </div>
      ))}
    </div>
  );
}

export function SportTotals({ pullTotal, pushTotal }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl p-4 flex items-center gap-3 shadow-sm"
      >
        <div className="w-10 h-10 bg-white/25 rounded-xl flex items-center justify-center text-2xl shrink-0">💎</div>
        <div>
          <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Klimmzüge</p>
          <p className="text-2xl font-heading font-bold text-white leading-none">{pullTotal}</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-gradient-to-br from-amber-400 to-yellow-300 rounded-2xl p-4 flex items-center gap-3 shadow-sm"
      >
        <div className="w-10 h-10 bg-white/30 rounded-xl flex items-center justify-center text-2xl shrink-0">🪙</div>
        <div>
          <p className="text-[10px] font-bold text-amber-900/70 uppercase tracking-wider">Liegestützen</p>
          <p className="text-2xl font-heading font-bold text-amber-900 leading-none">{pushTotal}</p>
        </div>
      </motion.div>
    </div>
  );
}

export function SportToggle({ value, onChange }) {
  return (
    <div className="flex bg-muted rounded-xl p-1 gap-1">
      {[
        { key: "pull", label: "💎 Klimmzüge" },
        { key: "push", label: "🪙 Liegestützen" },
      ].map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
            value === tab.key ? "bg-card shadow text-foreground" : "text-muted-foreground"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
