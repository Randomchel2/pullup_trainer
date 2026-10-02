import { Check, Lock } from "lucide-react";
import { RARITY_LABEL } from "../lib/game";
import { cn } from "../lib/cn";

const CARD_GLOW = {
  common: "",
  rare: "shadow-[0_0_10px_1px] shadow-sky-400/40",
  epic: "shadow-[0_0_14px_2px] shadow-purple-400/50 ring-1 ring-purple-400/40",
  legendary:
    "shadow-[0_0_18px_3px] shadow-amber-400/60 ring-1 ring-amber-300/60 animate-glow-pulse",
  mythic:
    "shadow-[0_0_22px_5px] shadow-fuchsia-400/60 ring-1 ring-fuchsia-300/60 animate-glow-pulse",
};

const SHIMMER = { legendary: true, mythic: true };

function RarityShell({ rarity, children }) {
  return (
    <div className={cn("relative rounded-2xl", CARD_GLOW[rarity] || "")}>
      <div className="relative overflow-hidden rounded-2xl">
        {children}
        {SHIMMER[rarity] && (
          <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
            <span className="absolute top-0 left-0 h-full w-1/4 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer-sweep" />
          </span>
        )}
      </div>
    </div>
  );
}

export function ItemCard({ item, isEquipped, isOwned, onEquip }) {
  return (
    <button
      onClick={() => isOwned && onEquip(item)}
      disabled={!isOwned}
      className={cn(
        "relative flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-center transition-all",
        isEquipped
          ? "border-primary bg-primary/5"
          : isOwned
            ? "border-border bg-card hover:border-primary/40"
            : "border-border bg-muted/40 opacity-70",
      )}
    >
      {item.limited && (
        <span className="absolute top-1.5 right-1.5 text-[9px] font-bold uppercase tracking-wide bg-accent text-accent-foreground px-1.5 py-0.5 rounded-full">
          Limited
        </span>
      )}

      <RarityShell rarity={isOwned ? item.rarity : "common"}>
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center text-lg",
            item.type === "frame" ? "bg-secondary" : `bg-gradient-to-br ${item.value}`,
          )}
        >
          {item.type === "frame" ? item.emoji : ""}
        </div>
      </RarityShell>

      <p className="text-xs font-semibold truncate w-full">{item.name}</p>
      <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">
        {RARITY_LABEL[item.rarity]}
      </span>

      {isOwned ? (
        isEquipped ? (
          <span className="flex items-center gap-1 text-[10px] text-primary font-semibold">
            <Check className="w-3 h-3" /> Ausgerüstet
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground">Antippen zum Ausrüsten</span>
        )
      ) : (
        <div className="w-full space-y-1">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
              style={{ width: `${Math.round((item.progress || 0) * 100)}%` }}
            />
          </div>
          <span className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
            <Lock className="w-3 h-3" />
            {item.requirement || `${item.threshold} Reps`}
          </span>
        </div>
      )}
    </button>
  );
}
