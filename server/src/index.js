import express from "express";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

import {
  MAX_REPS,
  createChallenge,
  createEntry,
  createSession,
  deleteOwnChallenge,
  deleteOwnEntry,
  dropSession,
  listChallenges,
  listEntries,
  listOwnEntries,
  listUserCollections,
  resetAll,
  sessionUser,
  updateChallenge,
  upsertUserCollection,
} from "./db.js";

const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3001);
const isProd = process.env.NODE_ENV === "production";
// Im Produktiv gibt es /api/dev/reset gar nicht erst.
const devRoutes = !isProd && process.env.ALLOW_DEV_ROUTES !== "0";

// Im Produktiv lauscht der Dienst nur auf loopback – Caddy spricht ihn von
// dort an. So kann niemand das Ratenlimit per X-Forwarded-For aushebeln.
const HOST = process.env.HOST || (isProd ? "127.0.0.1" : "0.0.0.0");

const app = express();
app.disable("x-powered-by");
// "loopback": X-Forwarded-For zählt nur, wenn die Verbindung lokalher kommt.
app.set("trust proxy", "loopback");
app.use(express.json({ limit: "16kb" }));

// Sehr grobe Bremse gegen das Zuspammen einer Instanz.
const buckets = new Map();
const RATE_LIMIT = 240;
const RATE_WINDOW = 60_000;

app.use((req, res, next) => {
  if (!req.path.startsWith("/api/")) return next();
  const now = Date.now();
  const key = req.ip || "unknown";
  const hits = (buckets.get(key) || []).filter((t) => now - t < RATE_WINDOW);
  if (hits.length >= RATE_LIMIT) {
    return res.status(429).json({ error: "Zu viele Anfragen – kurz Pause machen" });
  }
  hits.push(now);
  buckets.set(key, hits);
  next();
});

// IPs, die seit 10 Minuten still sind, nicht für immer mitzählen.
const sweep = setInterval(() => {
  const cutoff = Date.now() - 10 * RATE_WINDOW;
  for (const [key, hits] of buckets) {
    if (hits.length === 0 || hits.at(-1) < cutoff) buckets.delete(key);
  }
}, 5 * RATE_WINDOW);
sweep.unref();

const KINDS = new Set(["pull", "push"]);

function kind(req, res, next) {
  if (!KINDS.has(req.params.kind)) {
    return res.status(404).json({ error: "Unbekannte Kategorie" });
  }
  next();
}

/** Name kommt ausschließlich aus dem Token, nie aus dem Request-Body. */
function requireSession(req, res, next) {
  const userName = sessionUser(req.get("x-session"));
  if (!userName) {
    return res.status(401).json({ error: "Nicht angemeldet – bitte neu anmelden" });
  }
  req.userName = userName;
  next();
}

const wrap = (fn) => (req, res, next) => {
  try {
    const result = fn(req, res);
    if (result !== undefined) res.json(result);
  } catch (err) {
    next(err);
  }
};

const notFound = (message) => {
  const err = new Error(message);
  err.status = 404;
  return err;
};

// ------------------------------------------------------------------ Login --
// Nickname + Token tauschen. Bewusst ohne Passwort – wer den Nickname kennt,
// kann unter diesem Namen trainieren. Für den öffentlichen Betrieb von origin
// zuständig; siehe README.
app.post("/api/sessions", wrap((req) => createSession(req.body?.userName)));
app.delete("/api/sessions", requireSession, wrap((req) => ({ ok: dropSession(req.get("x-session")) })));

// ---------------------------------------------------------------- Entries --
// Lesen bleibt offen, sonst könnte niemand die Rangliste sehen.
app.get("/api/entries/:kind", kind, wrap((req) => listEntries(req.params.kind)));

// Eigene Einträge für die Historie.
app.get("/api/my-entries", requireSession, wrap((req) => listOwnEntries(req.userName)));

app.post("/api/entries/:kind", kind, requireSession, wrap((req) =>
  createEntry(req.params.kind, req.userName, req.body ?? {}),
));

// Löscht nur eigene Einträge.
app.delete(
  "/api/entries/:id",
  requireSession,
  wrap((req) => {
    if (!deleteOwnEntry(Number(req.params.id), req.userName)) {
      throw notFound("Eintrag nicht gefunden");
    }
    return { ok: true };
  }),
);

// --------------------------------------------------------- Avatar / Sammlung --
app.get("/api/user-collections", wrap(() => listUserCollections()));
app.put(
  "/api/user-collections",
  requireSession,
  wrap((req) => upsertUserCollection(req.userName, req.body ?? {})),
);

// ------------------------------------------------------------- Challenges --
app.get("/api/challenges/:kind", kind, wrap((req) => listChallenges(req.params.kind)));
app.post(
  "/api/challenges/:kind",
  kind,
  requireSession,
  wrap((req) => createChallenge(req.params.kind, req.userName, req.body ?? {})),
);
app.patch("/api/challenges/:id", requireSession, wrap((req) => {
  const row = updateChallenge(Number(req.params.id), req.body ?? {});
  if (!row) throw notFound("Challenge nicht gefunden");
  return row;
}));
// Nur der Ersteller darf löschen.
app.delete(
  "/api/challenges/:id",
  requireSession,
  wrap((req) => {
    if (!deleteOwnChallenge(Number(req.params.id), req.userName)) {
      throw notFound("Challenge nicht gefunden oder nicht von dir");
    }
    return { ok: true };
  }),
);

// ------------------------------------------------------------------ Admin --
if (devRoutes) {
  app.post("/api/dev/reset", wrap(() => {
    resetAll();
    return { ok: true };
  }));
}

app.get("/api/health", wrap(() => ({
  ok: true,
  service: "pullup-trainer",
  maxReps: MAX_REPS,
  devRoutes,
})));

// ---- Statisches Frontend ausliefern (Produktion) -------------------------
const dist = resolve(here, "..", "..", "client", "dist");
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(resolve(dist, "index.html"));
  });
}

app.use("/api", (req, res) => res.status(404).json({ error: "Unbekannter Endpunkt" }));

app.use((err, req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || "Serverfehler" });
});

app.listen(PORT, HOST, () => {
  console.log(`PullUp Trainer API läuft auf http://${HOST}:${PORT}`);
  console.log(`Modus: ${isProd ? "produktion" : "entwicklung"} · dev-routes: ${devRoutes}`);
});
