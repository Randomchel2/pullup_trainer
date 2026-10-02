import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { todayKey } from "../lib/game";

const KIND_META = {
  pull: { icon: "💎", label: "Klimmzüge", accent: "text-blue-600" },
  push: { icon: "🪙", label: "Liegestützen", accent: "text-amber-700" },
};

export function dayLabel(dateKey) {
  const today = todayKey();
  if (dateKey === today) return "Heute";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateKey === todayKey(yesterday)) return "Gestern";

  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    ...(date.getFullYear() === new Date().getFullYear() ? {} : { year: "numeric" }),
  });
}

/** Gruppiert die flache Liste nach Tag,ältester Tag zuerst. */
export function groupByDay(entries) {
  const groups = [];
  let current = null;
  for (const entry of entries) {
    if (!current || current.date !== entry.date) {
      current = { date: entry.date, entries: [] };
      groups.push(current);
    }
    current.entries.push(entry);
  }
  return groups;
}

function DeleteButton({ onClick, busy, label }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      title="Eintrag löschen"
      aria-label={label}
      className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}

export function EntryRow({ entry, onDelete, deleting }) {
  const meta = KIND_META[entry.kind];
  // Jahreszahl nur zeigen, wenn sie nicht das laufende Jahr ist.
  const year = entry.date.slice(0, 4);
  const showYear = year !== todayKey().slice(0, 4);

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted/50 transition-colors">
      <span className="text-lg shrink-0">{meta.icon}</span>
      <span className={`font-heading font-bold text-sm shrink-0 ${meta.accent}`}>
        {entry.count}
      </span>
      <span className="text-xs text-muted-foreground truncate flex-1">
        {meta.label}
        {showYear && <span className="opacity-60"> · {year}</span>}
      </span>
      <DeleteButton
        onClick={onDelete}
        busy={deleting}
        label={`Eintrag ${meta.label} über ${entry.count} löschen`}
      />
    </div>
  );
}

/** Kompakte Liste der letzten Einträge – für die Startseite. */
export function RecentEntries({ entries, onDelete, deleting, limit = 5 }) {
  if (!entries.length) return null;
  const shown = entries.slice(0, limit);

  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Zuletzt eingetragen
        </p>
        <Link to="/history" className="text-xs text-primary font-medium hover:underline">
          Alle
        </Link>
      </div>
      <div className="space-y-0.5">
        {shown.map((entry) => (
          <EntryRow
            key={entry.id}
            entry={entry}
            onDelete={() => onDelete(entry)}
            deleting={deleting}
          />
        ))}
      </div>
    </div>
  );
}
