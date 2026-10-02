import { useState } from "react";
import { motion } from "framer-motion";
import { Dumbbell } from "lucide-react";
import { useSignIn } from "../lib/api";
import { Button, Input } from "./ui";

/** Namenswahl – der Server antwortet mit einem Token, der alles weitere regelt. */
export function Onboarding({ onConfirm }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const signIn = useSignIn();

  const submit = async (e) => {
    e.preventDefault();
    const value = name.trim();
    if (!value) return;
    try {
      setError("");
      const session = await signIn.mutateAsync(value);
      onConfirm(session.userName, session.token);
    } catch (err) {
      setError(err.message || "Anmeldung fehlgeschlagen");
    }
  };

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center p-6 z-50">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6 text-center"
      >
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
            <Dumbbell className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>

        <div>
          <h1 className="font-heading text-3xl font-bold">PullUp Pro</h1>
          <p className="text-muted-foreground mt-2">Wie soll dich die Community nennen?</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <Input
            placeholder="Dein Name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 text-center text-lg rounded-xl"
            autoFocus
            maxLength={30}
          />
          <Button
            type="submit"
            disabled={!name.trim() || signIn.isPending}
            className="w-full h-12 rounded-xl text-base font-semibold"
          >
            {signIn.isPending ? "Einen Moment..." : "Loslegen 💪"}
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </form>
      </motion.div>
    </div>
  );
}
