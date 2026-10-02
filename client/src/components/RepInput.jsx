import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Minus, Plus } from "lucide-react";
import { Button, Input } from "./ui";
import { MAX_REPS } from "../lib/api";

/** Schnellwahl – deckt den Alltag ab, ohne 255 Felder zu zeigen. */
const QUICK = [1, 3, 5, 10, 15, 20, 30, 50];

/** Reps-Eingabe mit Stepper und Schnellwahl. Obergrenze 255 (ein Byte). */
export function RepInput({ onAdd, isAdding, label = "Klimmzüge eintragen", unit = "Klimmzüge" }) {
  const [value, setValue] = useState(5);
  const [saved, setSaved] = useState(false);

  const clamp = (n) => Math.min(MAX_REPS, Math.max(1, Number.isFinite(n) ? n : 1));
  const bump = (delta) => setValue((v) => clamp(v + delta));

  const submit = async () => {
    if (value < 1 || value > MAX_REPS) return;
    await onAdd(value);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <h3 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wider">
        {label}
      </h3>

      <div className="flex items-center gap-3 justify-center">
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-xl"
          onClick={() => bump(-1)}
          disabled={value <= 1}
        >
          <Minus className="w-5 h-5" />
        </Button>
        <Input
          type="number"
          inputMode="numeric"
          min="1"
          max={MAX_REPS}
          value={value}
          onChange={(e) => setValue(clamp(parseInt(e.target.value, 10)))}
          onBlur={() => setValue((v) => clamp(v))}
          className="w-24 h-14 text-center text-2xl font-heading font-bold rounded-xl border-2"
        />
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-xl"
          onClick={() => bump(1)}
          disabled={value >= MAX_REPS}
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex gap-2 justify-center flex-wrap">
        {QUICK.map((n) => (
          <button
            key={n}
            onClick={() => setValue(n)}
            className={`min-w-[2.75rem] px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              value === n
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {saved ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-2 py-3 text-primary font-semibold"
          >
            <Check className="w-5 h-5" />
            Eingetragen! Weiter so! 🔥
          </motion.div>
        ) : (
          <motion.div key="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Button
              onClick={submit}
              disabled={isAdding}
              className="w-full h-12 rounded-xl text-base font-semibold bg-primary hover:bg-primary/90"
            >
              {isAdding ? "Wird gespeichert..." : `${value} ${unit} eintragen`}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
