import { RARITY_ORDER, findItem } from "../lib/game";
import { cn } from "../lib/cn";

const SIZES = { sm: "w-12 h-12", md: "w-16 h-16", lg: "w-24 h-24" };
const TEXT = { sm: "text-xl", md: "text-3xl", lg: "text-5xl" };

const RARITY_STYLE = {
  common: { ring: "", glow: "shadow-sm" },
  rare: { ring: "ring-1 ring-sky-400/60", glow: "shadow-[0_0_10px_2px] shadow-sky-400/50" },
  epic: {
    ring: "ring-1 ring-purple-400/70",
    glow: "shadow-[0_0_14px_3px] shadow-purple-400/60",
    anim: "animate-glow-pulse",
  },
  legendary: {
    ring: "ring-2 ring-amber-300/80",
    glow: "shadow-[0_0_18px_4px] shadow-amber-400/70",
    anim: "animate-glow-pulse",
  },
  mythic: {
    ring: "ring-2 ring-fuchsia-300/80",
    glow: "shadow-[0_0_22px_5px] shadow-fuchsia-400/70",
    anim: "animate-glow-pulse",
  },
};

const SHIMMER = { legendary: true, mythic: true };
const SPARKLES = { mythic: true };

function highestRarity(list) {
  if (!list.length) return "common";
  const index = (r) => RARITY_ORDER.indexOf(r);
  return list.reduce((best, r) => (index(r) > index(best) ? r : best), list[0]);
}

/** Avatar-Kachel: Verlauf (Farbe) + Emoji bzw. Initial (Rahmen) + Rarity-Glow. */
export function Avatar({
  userName,
  equippedColorId,
  equippedFrameId,
  size = "md",
  showRarity = true,
}) {
  const color = findItem(equippedColorId);
  const frame = findItem(equippedFrameId);
  const gradient = color?.value || "from-slate-400 to-slate-500";
  const rarity = showRarity ? highestRarity([color?.rarity, frame?.rarity].filter(Boolean)) : "common";
  const style = RARITY_STYLE[rarity];

  return (
    <div className="relative inline-flex shrink-0">
      <div
        className={cn(
          "relative rounded-2xl bg-gradient-to-br flex items-center justify-center transition-all",
          SIZES[size],
          gradient,
          style.glow,
          style.ring,
          style.anim,
        )}
      >
        <span className={cn("leading-none drop-shadow-sm", TEXT[size])}>
          {frame ? frame.emoji : userName?.[0]?.toUpperCase() || "?"}
        </span>
        {SHIMMER[rarity] && (
          <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
            <span className="absolute top-0 left-0 h-full w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer-sweep" />
          </span>
        )}
      </div>
      {SPARKLES[rarity] && (
        <>
          <span className="pointer-events-none absolute -top-1 -right-1 text-[10px] animate-sparkle-twinkle">✨</span>
          <span
            className="pointer-events-none absolute -bottom-1 -left-1 text-[10px] animate-sparkle-twinkle"
            style={{ animationDelay: "0.6s" }}
          >
            ✨
          </span>
          <span
            className="pointer-events-none absolute top-1/2 -left-1.5 -translate-y-1/2 text-[8px] animate-sparkle-twinkle"
            style={{ animationDelay: "1s" }}
          >
            ⭐
          </span>
        </>
      )}
    </div>
  );
}
