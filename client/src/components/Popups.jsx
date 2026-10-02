import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, Dumbbell, History, Home, Sparkles, Swords, Trophy, X } from "lucide-react";

import { currentSeason } from "../lib/game";
import { useOncePopup } from "../lib/storage";

/** Begrüßungs-Popup, wenn seit dem letzten Besuch eine neue Season startet. */
function SeasonPopup() {
  const season = currentSeason();
  const [open, dismiss] = useOncePopup(`season-${season.number}`);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="fixed bottom-28 inset-x-0 mx-auto z-[100] w-[calc(100%-2rem)] max-w-sm"
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-heading font-bold text-sm">{season.name} gestartet! 🎉</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {season.monthLabel} – Sammle Reps für neue Farben & Rahmen.
              </p>
            </div>
            <button
              onClick={dismiss}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function VersionPopup() {
  const [open, dismiss] = useOncePopup("app_version-1.0.3");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="fixed bottom-28 inset-x-0 mx-auto z-[100] w-[calc(100%-2rem)] max-w-sm"
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-heading font-bold text-sm">Update installiert 🎉</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                PullUp Trainer 1.0.3 ist bereit. Viel Spaß beim Training!
              </p>
            </div>
            <button
              onClick={dismiss}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SeasonPopups() {
  return (
    <>
      <SeasonPopup />
      <VersionPopup />
    </>
  );
}

export const NAV_ITEMS = [
  { path: "/", Icon: Home, label: "Home" },
  { path: "/stats", Icon: BarChart3, label: "Stats" },
  { path: "/ranking", Icon: Trophy, label: "Rangliste" },
  { path: "/challenges", Icon: Swords, label: "Challenges" },
  { path: "/history", Icon: History, label: "Verlauf" },
  { path: "/avatar", Icon: Dumbbell, label: "Avatar" },
];
