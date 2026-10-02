import { DatabaseSync } from "node:sqlite";
import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.PULLUP_DB || resolve(here, "..", "data", "pullup.db");

mkdirSync(dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);

db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

/** Obergrenze pro Eintrag – passt in ein Byte. */
export const MAX_REPS = 255;

const MAX_NAME_LENGTH = 30;

db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    kind       TEXT    NOT NULL CHECK (kind IN ('pull', 'push')),
    count      INTEGER NOT NULL CHECK (count BETWEEN 1 AND ${MAX_REPS}),
    date       TEXT    NOT NULL,
    user_name  TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_entries_kind_date ON entries (kind, date DESC);
  CREATE INDEX IF NOT EXISTS idx_entries_user ON entries (user_name, date DESC, id DESC);

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_name  TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_name);

  CREATE TABLE IF NOT EXISTS user_collections (
    user_name           TEXT PRIMARY KEY,
    equipped_color_id   TEXT,
    equipped_frame_id   TEXT,
    unlocked_item_ids   TEXT NOT NULL DEFAULT '[]',
    updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS challenges (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    kind          TEXT    NOT NULL CHECK (kind IN ('pull', 'push')),
    title         TEXT    NOT NULL,
    description   TEXT    NOT NULL DEFAULT '',
    goal          INTEGER NOT NULL,
    end_date      TEXT    NOT NULL,
    created_date  TEXT    NOT NULL,
    creator_name  TEXT    NOT NULL,
    participants  TEXT    NOT NULL DEFAULT '[]',
    emoji         TEXT    NOT NULL DEFAULT '🏆',
    color         TEXT    NOT NULL DEFAULT 'from-primary to-accent',
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_challenges_kind ON challenges (kind, created_date DESC);
`);

const DEFAULT_LIST_LIMIT = 5000;
const HISTORY_LIMIT = 500;

const today = () => new Date().toISOString().slice(0, 10);

const cleanName = (value) => {
  const name = String(value ?? "").trim();
  if (!name) throw badRequest("Name darf nicht leer sein");
  if (name.length > MAX_NAME_LENGTH)
    throw badRequest(`Name ist zu lang (max. ${MAX_NAME_LENGTH} Zeichen)`);
  return name;
};

// --------------------------------------------------------------- Sessions --

/**
 * Ein Token gehört genau einem Nickname. Alle schreibenden Zugriffe leiten
 * den Namen hieraus ab – nie aus dem Request-Body.
 */
export function createSession(userName) {
  const name = cleanName(userName);
  const token = randomBytes(24).toString("hex");
  // Alte Tokens aufräumen, damit die Tabelle nicht ewig wächst.
  db.prepare("DELETE FROM sessions WHERE created_at < datetime('now', '-1 year')").run();
  db.prepare("INSERT INTO sessions (token, user_name) VALUES (?, ?)").run(token, name);
  return { token, userName: name };
}

export function sessionUser(token) {
  if (!token) return null;
  const row = db.prepare("SELECT user_name FROM sessions WHERE token = ?").get(token);
  return row?.user_name ?? null;
}

export function dropSession(token) {
  if (!token) return false;
  return db.prepare("DELETE FROM sessions WHERE token = ?").run(token).changes > 0;
}

// ----------------------------------------------------------------- Entries --

const hydrateEntry = (row) => ({
  id: row.id,
  kind: row.kind,
  count: row.count,
  date: row.date,
  userName: row.user_name,
});

export function listEntries(kind, limit = DEFAULT_LIST_LIMIT) {
  return db
    .prepare(
      `SELECT * FROM entries
        WHERE kind = ?
        ORDER BY date DESC, id DESC
        LIMIT ?`,
    )
    .all(kind, limit)
    .map(hydrateEntry);
}

/** Alle eigenen Einträge, beide Sportarten – für die Historie. */
export function listOwnEntries(userName, limit = HISTORY_LIMIT) {
  return db
    .prepare(
      `SELECT * FROM entries
        WHERE user_name = ?
        ORDER BY date DESC, id DESC
        LIMIT ?`,
    )
    .all(userName, limit)
    .map(hydrateEntry);
}

export function createEntry(kind, userName, { count, date }) {
  const n = Number.parseInt(count, 10);
  if (!Number.isInteger(n) || n < 1 || n > MAX_REPS) {
    throw badRequest(`count muss eine ganze Zahl zwischen 1 und ${MAX_REPS} sein`);
  }
  const name = cleanName(userName);

  const day = /^\d{4}-\d{2}-\d{2}$/.test(String(date ?? "")) ? date : today();

  const info = db
    .prepare("INSERT INTO entries (kind, count, date, user_name) VALUES (?, ?, ?, ?)")
    .run(kind, n, day, name);

  return hydrateEntry(
    db.prepare("SELECT * FROM entries WHERE id = ?").get(info.lastInsertRowid),
  );
}

/** Löscht nur eigene Einträge – fremde liefert 404, nicht 403. */
export function deleteOwnEntry(id, userName) {
  return (
    db
      .prepare("DELETE FROM entries WHERE id = ? AND user_name = ?")
      .run(id, userName).changes > 0
  );
}

// ----------------------------------------------------- Avatar / Sammlung --

export function listUserCollections() {
  return db
    .prepare("SELECT * FROM user_collections ORDER BY user_name")
    .all()
    .map(hydrateCollection);
}

export function upsertUserCollection(userName, patch) {
  const name = cleanName(userName);

  const current = db
    .prepare("SELECT * FROM user_collections WHERE user_name = ?")
    .get(name);

  const merged = {
    equippedColorId:
      patch.equippedColorId !== undefined
        ? patch.equippedColorId || null
        : current?.equipped_color_id ?? null,
    equippedFrameId:
      patch.equippedFrameId !== undefined
        ? patch.equippedFrameId || null
        : current?.equipped_frame_id ?? null,
    unlockedItemIds: Array.isArray(patch.unlockedItemIds)
      ? patch.unlockedItemIds
      : current
        ? JSON.parse(current.unlocked_item_ids)
        : [],
  };

  db.prepare(
    `INSERT INTO user_collections
       (user_name, equipped_color_id, equipped_frame_id, unlocked_item_ids, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT (user_name) DO UPDATE SET
       equipped_color_id = excluded.equipped_color_id,
       equipped_frame_id = excluded.equipped_frame_id,
       unlocked_item_ids = excluded.unlocked_item_ids,
       updated_at       = datetime('now')`,
  ).run(
    name,
    merged.equippedColorId,
    merged.equippedFrameId,
    JSON.stringify([...new Set(merged.unlockedItemIds)]),
  );

  return hydrateCollection(
    db.prepare("SELECT * FROM user_collections WHERE user_name = ?").get(name),
  );
}

// ------------------------------------------------------------- Challenges --

export function listChallenges(kind) {
  return db
    .prepare(
      `SELECT * FROM challenges
        WHERE kind = ?
        ORDER BY created_date DESC, id DESC
        LIMIT 100`,
    )
    .all(kind)
    .map(hydrateChallenge);
}

export function createChallenge(kind, userName, body) {
  const creator = cleanName(userName);
  const title = String(body.title ?? "").trim();
  if (!title) throw badRequest("title fehlt");
  if (title.length > 60) throw badRequest("title ist zu lang (max. 60 Zeichen)");
  const goal = Number.parseInt(body.goal, 10);
  if (!Number.isInteger(goal) || goal < 1 || goal > 100000)
    throw badRequest("goal muss eine ganze Zahl zwischen 1 und 100000 sein");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.endDate ?? "")))
    throw badRequest("endDate muss im Format YYYY-MM-DD sein");

  // Der Ersteller ist immer Teilnehmer – der Client kann das nicht aussparen.
  const participants = Array.isArray(body.participants)
    ? [...new Set([creator, ...body.participants.filter((n) => typeof n === "string")])]
    : [creator];

  const info = db
    .prepare(
      `INSERT INTO challenges
         (kind, title, description, goal, end_date, created_date,
          creator_name, participants, emoji, color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      kind,
      title,
      String(body.description ?? "").slice(0, 200),
      goal,
      body.endDate,
      /^\d{4}-\d{2}-\d{2}$/.test(String(body.createdDate ?? ""))
        ? body.createdDate
        : today(),
      creator,
      JSON.stringify(participants),
      body.emoji || "🏆",
      body.color || "from-primary to-accent",
    );

  return hydrateChallenge(
    db.prepare("SELECT * FROM challenges WHERE id = ?").get(info.lastInsertRowid),
  );
}

export function updateChallenge(id, patch) {
  const current = db.prepare("SELECT * FROM challenges WHERE id = ?").get(id);
  if (!current) return null;

  if (Array.isArray(patch.participants)) {
    const names = patch.participants.filter((n) => typeof n === "string" && n.trim());
    db.prepare("UPDATE challenges SET participants = ? WHERE id = ?").run(
      JSON.stringify([...new Set(names)]),
      id,
    );
  }
  for (const [column, key, maxLength] of [
    ["title", "title", 60],
    ["description", "description", 200],
    ["emoji", "emoji", 8],
    ["color", "color", 80],
  ]) {
    if (patch[key] !== undefined) {
      db.prepare(`UPDATE challenges SET ${column} = ? WHERE id = ?`).run(
        String(patch[key]).slice(0, maxLength),
        id,
      );
    }
  }
  if (patch.goal !== undefined) {
    const goal = Number.parseInt(patch.goal, 10);
    if (Number.isInteger(goal) && goal > 0 && goal <= 100000) {
      db.prepare("UPDATE challenges SET goal = ? WHERE id = ?").run(goal, id);
    }
  }
  if (patch.endDate !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(String(patch.endDate))) {
    db.prepare("UPDATE challenges SET end_date = ? WHERE id = ?").run(patch.endDate, id);
  }
  return hydrateChallenge(db.prepare("SELECT * FROM challenges WHERE id = ?").get(id));
}

/** Nur der Ersteller darf eine Challenge löschen. */
export function deleteOwnChallenge(id, userName) {
  return (
    db
      .prepare("DELETE FROM challenges WHERE id = ? AND creator_name = ?")
      .run(id, userName).changes > 0
  );
}

// ------------------------------------------------------------------ Admin --

export function resetAll() {
  db.exec(
    "DELETE FROM entries; DELETE FROM sessions; DELETE FROM user_collections; DELETE FROM challenges;",
  );
}

function hydrateCollection(row) {
  if (!row) return null;
  return {
    userName: row.user_name,
    equippedColorId: row.equipped_color_id ?? null,
    equippedFrameId: row.equipped_frame_id ?? null,
    unlockedItemIds: JSON.parse(row.unlocked_item_ids || "[]"),
  };
}

function hydrateChallenge(row) {
  if (!row) return null;
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    description: row.description,
    goal: row.goal,
    endDate: row.end_date,
    createdDate: row.created_date,
    creatorName: row.creator_name,
    participants: JSON.parse(row.participants || "[]"),
    emoji: row.emoji,
    color: row.color,
  };
}

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}
