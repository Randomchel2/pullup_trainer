import { useEffect, useMemo } from "react";
import { Sparkles } from "lucide-react";

import { useEntries, useSaveCollection, useUserCollections } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { ItemCard } from "../components/ItemCard";
import { Spinner } from "../components/ui";
import { coinValue, currentSeason, evaluateAchievements, withProgress } from "../lib/game";

/** Bereits freigeschaltete Items plus alle gerade verdienten zusammenführen. */
const earnedIds = (items, collection) => [
  ...new Set([
    ...(collection?.unlockedItemIds || []),
    ...items.filter((i) => i.earned).map((i) => i.id),
  ]),
];

export default function AvatarPage({ userName }) {
  const season = useMemo(() => currentSeason(), []);

  const { data: pullEntries = [] } = useEntries("pull");
  const { data: pushEntries = [] } = useEntries("push");
  const { data: collections = [], isFirstLoad } = useUserCollections();

  // Der Name kommt aus der Session – die Sammlung gehört genau diesem Token.
  const save = useSaveCollection();

  const myPull = useMemo(
    () => pullEntries.filter((e) => e.userName === userName),
    [pullEntries, userName],
  );
  const myPush = useMemo(
    () => pushEntries.filter((e) => e.userName === userName),
    [pushEntries, userName],
  );

  const coins = coinValue(myPull, myPush);
  const cosmetics = useMemo(() => withProgress(coins), [coins]);
  const achievements = useMemo(
    () => evaluateAchievements(pullEntries, userName),
    [pullEntries, userName],
  );
  const everything = useMemo(() => [...cosmetics, ...achievements], [cosmetics, achievements]);

  const collection = useMemo(
    () => collections.find((c) => c.userName === userName) || null,
    [collections, userName],
  );
  const unlocked = useMemo(
    () => new Set(collection?.unlockedItemIds || []),
    [collection],
  );

  // Freigeschaltete Gegenstände automatisch in der Sammlung eintragen.
  const earnedSignature = everything
    .filter((i) => i.earned)
    .map((i) => i.id)
    .join(",");
  useEffect(() => {
    if (!userName) return;
    const missing = everything.filter((i) => i.earned && !unlocked.has(i.id));
    if (missing.length) save.mutate({ unlockedItemIds: earnedIds(everything, collection) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [earnedSignature]);

  const equip = (item) => {
    const key =
      item.type === "color"
        ? "equippedColorId"
        : item.type === "frame"
          ? "equippedFrameId"
          : "equippedAuraId";
    save.mutate({ [key]: item.id, unlockedItemIds: earnedIds(everything, collection) });
  };

  if (isFirstLoad) return <Spinner />;

  const colors = cosmetics.filter((i) => i.type === "color");
  const frames = cosmetics.filter((i) => i.type === "frame");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold">Avatar</h1>
        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-primary" /> {season.name} · {coins} Reps gesamt
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-5 flex items-center justify-center">
        <Avatar
          userName={userName}
          equippedColorId={collection?.equippedColorId}
          equippedFrameId={collection?.equippedFrameId}
          size="lg"
        />
      </div>

      <section className="space-y-2">
        <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Farben
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {colors.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              isOwned={unlocked.has(item.id)}
              isEquipped={collection?.equippedColorId === item.id}
              onEquip={equip}
            />
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Rahmen
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {frames.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              isOwned={unlocked.has(item.id)}
              isEquipped={collection?.equippedFrameId === item.id}
              onEquip={equip}
            />
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Erfolge
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {achievements.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              isOwned={unlocked.has(item.id)}
              isEquipped={
                item.type === "color"
                  ? collection?.equippedColorId === item.id
                  : collection?.equippedFrameId === item.id
              }
              onEquip={equip}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
