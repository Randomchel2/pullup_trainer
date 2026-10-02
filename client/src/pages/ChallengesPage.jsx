import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Flame, Plus, Trash2, Trophy, X, Zap } from "lucide-react";

import {
  useChallenges,
  useCreateChallenge,
  useDeleteChallenge,
  useEntries,
  useUpdateChallenge,
} from "../lib/api";
import { SportToggle } from "../components/Tiles";
import { Button, Input, Spinner } from "../components/ui";
import { CHALLENGE_TEMPLATES, UNIT, addDaysToToday, daysUntil, isPast } from "../lib/game";

function ChallengeCard({
  challenge,
  standings,
  isParticipant,
  myName,
  unitLabel,
  onJoin,
  onDelete,
  isMine,
}) {
  const remaining = daysUntil(challenge.endDate);
  const me = standings.find((s) => s.name === myName);
  const progress = me ? Math.min((me.total / challenge.goal) * 100, 100) : 0;
  const urgency = remaining <= 2 ? "🔴" : remaining <= 5 ? "🟡" : "🟢";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border overflow-hidden"
    >
      <div
        className={`bg-gradient-to-r ${challenge.color || "from-primary to-accent"} p-4 flex items-center justify-between`}
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">{challenge.emoji || "🏆"}</span>
          <div>
            <h3 className="font-heading font-bold text-white text-base leading-tight">{challenge.title}</h3>
            {challenge.description && (
              <p className="text-white/70 text-xs mt-0.5">{challenge.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isMine && (
            <button
              onClick={onDelete}
              title="Challenge löschen"
              aria-label={`Challenge ${challenge.title} löschen`}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:bg-white/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {!isParticipant && (
            <Button
              size="sm"
              onClick={onJoin}
              className="bg-white text-gray-900 hover:bg-white/90 font-bold rounded-xl shrink-0 text-xs px-3"
            >
              Mitmachen
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex gap-3">
          <Stat label="Ziel" value={challenge.goal} />
          <Stat label="Tage übrig" value={`${urgency} ${remaining}`} />
          <Stat label="Teilnehmer" value={`👥 ${challenge.participants?.length || 0}`} />
        </div>

        {isParticipant && me && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-primary">Dein Fortschritt</span>
              <span className="text-muted-foreground font-medium">
                {me.total} / {challenge.goal} {unitLabel}
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`h-full bg-gradient-to-r ${challenge.color || "from-primary to-accent"} rounded-full`}
              />
            </div>
            {progress >= 100 && (
              <p className="text-xs text-center font-bold text-primary">🎉 Ziel erreicht!</p>
            )}
          </div>
        )}

        {standings.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rangliste</p>
            {standings.slice(0, 5).map((row, i) => {
              const pct = Math.min((row.total / challenge.goal) * 100, 100);
              return (
                <div
                  key={row.name}
                  className={`flex items-center gap-2 ${row.name === myName ? "opacity-100" : "opacity-80"}`}
                >
                  <span className="text-sm w-5 shrink-0">{["🥇", "🥈", "🥉"][i] || `${i + 1}.`}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span
                        className={`font-medium truncate ${row.name === myName ? "text-primary" : ""}`}
                      >
                        {row.name}
                        {row.name === myName ? " (Du)" : ""}
                      </span>
                      <span className="text-muted-foreground shrink-0 ml-2">{row.total}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          row.name === myName
                            ? `bg-gradient-to-r ${challenge.color}`
                            : "bg-muted-foreground/40"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="flex-1 bg-muted/50 rounded-xl p-2.5 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading font-bold text-sm">{value}</p>
    </div>
  );
}

function ChallengesBoard({ kind, userName }) {
  const [showForm, setShowForm] = useState(false);
  const [template, setTemplate] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", goal: "", endDate: "" });

  const { data: challenges = [], isFirstLoad } = useChallenges(kind);
  const { data: entries = [] } = useEntries(kind);
  const createChallenge = useCreateChallenge(kind);
  const updateChallenge = useUpdateChallenge(kind);
  const deleteChallenge = useDeleteChallenge(kind);

  const templates = CHALLENGE_TEMPLATES[kind];
  const unit = UNIT[kind];

  const standingsFor = (challenge) => {
    if (!challenge.participants?.length) return [];
    const start = new Date(challenge.createdDate || Date.now());
    const end = new Date(challenge.endDate);
    return challenge.participants
      .map((name) => ({
        name,
        total: entries
          .filter(
            (e) =>
              e.userName === name &&
              new Date(e.date) >= start &&
              new Date(e.date) <= end,
          )
          .reduce((acc, e) => acc + (e.count || 0), 0),
      }))
      .sort((a, b) => b.total - a.total);
  };

  const useTemplate = (t) => {
    setTemplate(t);
    setForm({
      title: t.title,
      description: t.description,
      goal: String(t.goal),
      endDate: addDaysToToday(t.days),
    });
  };

  const submit = () => {
    if (!form.title || !form.goal || !form.endDate) return;
    createChallenge.mutate(
      {
        ...form,
        goal: parseInt(form.goal, 10),
        // creatorName setzt der Server aus der Session.
        participants: [userName],
        emoji: template?.emoji || "🏆",
        color: template?.color || "from-primary to-accent",
      },
      {
        onSuccess: () => {
          setShowForm(false);
          setTemplate(null);
          setForm({ title: "", description: "", goal: "", endDate: "" });
        },
      },
    );
  };

  const join = (challenge) => {
    const participants = challenge.participants || [];
    if (participants.includes(userName)) return;
    updateChallenge.mutate({ id: challenge.id, participants: [...participants, userName] });
  };

  // Löscht nur, was der Server auch erlaubt: eigene Challenges.
  const remove = (challenge) => {
    if (window.confirm(`Challenge "${challenge.title}" wirklich löschen?`)) {
      deleteChallenge.mutate(challenge.id);
    }
  };

  if (isFirstLoad) return <Spinner className="py-10" />;

  const running = challenges.filter((c) => !isPast(c.endDate));
  const finished = challenges.filter((c) => isPast(c.endDate));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-xl h-9 gap-2 bg-primary hover:bg-primary/90 text-sm"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Abbrechen" : "Neue Challenge"}
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-card rounded-2xl border border-border overflow-hidden"
          >
            <div className="p-4 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Vorlage wählen oder selbst erstellen
              </p>
              <div className="grid grid-cols-2 gap-2">
                {templates.map((t) => (
                  <button
                    key={t.title}
                    onClick={() => useTemplate(t)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-left transition-all ${
                      template?.title === t.title
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg bg-gradient-to-br ${t.color} flex items-center justify-center text-lg shrink-0`}
                    >
                      {t.emoji}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs truncate">{t.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {t.goal} Ziel · {t.days}T
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 space-y-3">
              <Input
                placeholder="Name"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="rounded-xl"
              />
              <Input
                placeholder="Beschreibung (optional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="rounded-xl"
              />
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder={`Ziel (${unit.plural})`}
                  value={form.goal}
                  onChange={(e) => setForm({ ...form, goal: e.target.value })}
                  className="rounded-xl"
                />
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <Button
                className="w-full rounded-xl bg-primary font-bold"
                onClick={submit}
                disabled={createChallenge.isPending || !form.title || !form.goal || !form.endDate}
              >
                <Zap className="w-4 h-4 mr-2" />
                Challenge starten!
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {challenges.length === 0 && (
        <div className="bg-card rounded-2xl border border-border p-10 text-center space-y-3">
          <div className="text-5xl">⚔️</div>
          <p className="font-heading font-bold text-lg">Noch keine Challenges</p>
          <p className="text-muted-foreground text-sm">Starte die erste und zeig wer der Boss ist!</p>
        </div>
      )}

      {running.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-primary" />
            <h2 className="font-heading font-semibold text-sm uppercase tracking-wider">Läuft gerade</h2>
          </div>
          {running.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              standings={standingsFor(challenge)}
              isParticipant={challenge.participants?.includes(userName)}
              myName={userName}
              unitLabel={unit.plural}
              onJoin={() => join(challenge)}
              onDelete={() => remove(challenge)}
              isMine={challenge.creatorName === userName}
            />
          ))}
        </div>
      )}

      {finished.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-heading font-semibold text-sm uppercase tracking-wider text-muted-foreground">
              Abgeschlossen
            </h2>
          </div>
          {finished.map((challenge) => {
            const winner = standingsFor(challenge)[0];
            return (
              <div
                key={challenge.id}
                className="bg-card rounded-2xl border border-border overflow-hidden opacity-70"
              >
                <div
                  className={`bg-gradient-to-r ${challenge.color || "from-muted to-muted"} p-3 flex items-center gap-2`}
                >
                  <span className="text-2xl">{challenge.emoji || "🏆"}</span>
                  <p className="font-heading font-bold text-white text-sm">{challenge.title}</p>
                  {challenge.creatorName === userName && (
                    <button
                      onClick={() => remove(challenge)}
                      title="Challenge löschen"
                      aria-label={`Challenge ${challenge.title} löschen`}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white/80 hover:bg-white/20 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <span className="ml-auto text-xs bg-white/20 text-white px-2 py-0.5 rounded-lg">
                    Beendet
                  </span>
                </div>
                {winner && (
                  <div className="p-3 flex items-center gap-2">
                    <p className="text-sm">
                      <span className="font-bold">{winner.name}</span> hat gewonnen mit{" "}
                      <span className="text-primary font-bold">{winner.total}</span> {unit.plural}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ChallengesPage({ userName }) {
  const [kind, setKind] = useState("pull");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold">Challenges</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Kämpfe gegen dich und andere</p>
      </div>

      <SportToggle value={kind} onChange={setKind} />

      <ChallengesBoard key={kind} kind={kind} userName={userName} />
    </div>
  );
}
