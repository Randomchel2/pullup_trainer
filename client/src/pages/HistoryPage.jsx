import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { LogOut } from "lucide-react";

import { useDeleteEntry, useOwnEntries, useSignOut } from "../lib/api";
import { EntryRow, dayLabel, groupByDay } from "../components/EntryList";
import { Button, Spinner } from "../components/ui";

const TABS = [
  { key: "all", label: "Alle" },
  { key: "pull", label: "💎 Klimmzüge" },
  { key: "push", label: "🪙 Liegestützen" },
];

export default function HistoryPage({ userName, onSignOut }) {
  const [kind, setKind] = useState("all");
  const { data: entries = [], isFirstLoad } = useOwnEntries();
  const deleteEntry = useDeleteEntry();
  const signOut = useSignOut();

  const filtered = useMemo(
    () => (kind === "all" ? entries : entries.filter((e) => e.kind === kind)),
    [entries, kind],
  );
  const groups = useMemo(() => groupByDay(filtered), [filtered]);

  const totals = useMemo(
    () => ({
      pull: filtered.filter((e) => e.kind === "pull").reduce((a, e) => a + e.count, 0),
      push: filtered.filter((e) => e.kind === "push").reduce((a, e) => a + e.count, 0),
    }),
    [filtered],
  );

  const remove = (entry) => {
    const label = dayLabel(entry.date);
    if (window.confirm(`Eintrag vom ${label} über ${entry.count} wirklich löschen?`)) {
      deleteEntry.mutate(entry.id);
    }
  };

  if (isFirstLoad) return <Spinner />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold">Verlauf</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {userName} · {entries.length} {entries.length === 1 ? "Eintrag" : "Einträge"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <p className="text-2xl font-heading font-bold text-blue-600">{totals.pull}</p>
          <p className="text-xs text-muted-foreground">Klimmzüge</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <p className="text-2xl font-heading font-bold text-amber-700">{totals.push}</p>
          <p className="text-xs text-muted-foreground">Liegestützen</p>
        </div>
      </div>

      <div className="flex bg-muted rounded-xl p-1 gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setKind(tab.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
              kind === tab.key ? "bg-card shadow text-foreground" : "text-muted-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-10 text-center space-y-3">
          <div className="text-5xl">📋</div>
          <p className="font-heading font-bold text-lg">Noch nichts eingetragen</p>
          <p className="text-muted-foreground text-sm">
            Deine ersten Einträge erscheinen hier automatisch.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div
              key={group.date}
              className="bg-card rounded-2xl border border-border overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-b border-border">
                <p className="text-xs font-semibold uppercase tracking-wider">
                  {dayLabel(group.date)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {group.entries.reduce((a, e) => a + e.count, 0)} gesamt
                </p>
              </div>
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-1.5 space-y-0.5"
              >
                {group.entries.map((entry) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    onDelete={() => remove(entry)}
                    deleting={deleteEntry.isPending && deleteEntry.variables === entry.id}
                  />
                ))}
              </motion.div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-2 flex justify-center">
        <Button
          variant="ghost"
          onClick={() => signOut.mutate(undefined, { onSuccess: onSignOut })}
          disabled={signOut.isPending}
          className="text-muted-foreground text-xs gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" />
          Abmelden
        </Button>
      </div>
    </div>
  );
}
