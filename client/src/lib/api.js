import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sessionToken } from "./storage";

/** Obergrenze pro Eintrag – identisch zu MAX_REPS im Server. */
export const MAX_REPS = 255;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(url, options = {}) {
  const token = sessionToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "X-Session": token } : {}),
      ...options.headers,
    },
  });
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (res.status === 401 && !url.endsWith("/api/sessions")) {
    // Token unbekannt (DB zurückgesetzt, abgelaufen) – zurück zum Onboarding.
    localStorage.removeItem("pullup_username");
    localStorage.removeItem("pullup_session");
    window.location.reload();
    throw new ApiError("Sitzung abgelaufen – bitte neu anmelden", 401);
  }
  if (!res.ok) throw new ApiError(body.error || `Fehler ${res.status}`, res.status);
  return body;
}

const json = (body) => ({ body: JSON.stringify(body) });

const entryKey = (kind) => [kind === "pull" ? "pullup-entries" : "pushup-entries"];

// ------------------------------------------------------------- Queries ----
// `placeholderData` statt `initialData`: die Seiten bekommen sofort ein Array,
// der erste Abruf läuft aber trotzdem – `initialData` gilt mit `staleTime`
// als frisch und würde den Request komplett überspringen.
// `isFirstLoad` ersetzt das bisherige `isLoading` für die Ladeanzeige.
const listQuery = (queryKey, url) => {
  const query = useQuery({ queryKey, queryFn: () => request(url), placeholderData: [] });
  return { ...query, isFirstLoad: query.isPlaceholderData || query.isLoading };
};

/** Öffentlich – die Rangliste braucht alle Namen. */
export function useEntries(kind) {
  return listQuery(entryKey(kind), `/api/entries/${kind}`);
}

export function useUserCollections() {
  return listQuery(["user-collections"], "/api/user-collections");
}

export function useChallenges(kind) {
  return listQuery(
    [kind === "pull" ? "challenges" : "pushup-challenges"],
    `/api/challenges/${kind}`,
  );
}

/** Eigene Einträge beider Sportarten – für die Historie. */
export function useOwnEntries() {
  return listQuery(["my-entries"], "/api/my-entries");
}

// ---------------------------------------------------------- Mutations ----
export function useSignIn() {
  return useMutation({
    mutationFn: (userName) =>
      request("/api/sessions", { method: "POST", ...json({ userName }) }),
  });
}

export function useSignOut() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => request("/api/sessions", { method: "DELETE" }),
    onSettled: () => {
      client.clear();
    },
  });
}

export function useAddEntry(kind) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ count, date }) =>
      request(`/api/entries/${kind}`, { method: "POST", ...json({ count, date }) }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: entryKey(kind) });
      client.invalidateQueries({ queryKey: ["my-entries"] });
    },
  });
}

/** Löscht einen Eintrag. Der Server prüft, dass er dir gehört. */
export function useDeleteEntry() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id) => request(`/api/entries/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["pullup-entries"] });
      client.invalidateQueries({ queryKey: ["pushup-entries"] });
      client.invalidateQueries({ queryKey: ["my-entries"] });
    },
  });
}

export function useSaveCollection() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (patch) =>
      request("/api/user-collections", { method: "PUT", ...json(patch) }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["user-collections"] }),
  });
}

export function useCreateChallenge(kind) {
  const client = useQueryClient();
  const key = [kind === "pull" ? "challenges" : "pushup-challenges"];
  return useMutation({
    mutationFn: (body) =>
      request(`/api/challenges/${kind}`, { method: "POST", ...json(body) }),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
}

export function useUpdateChallenge(kind) {
  const client = useQueryClient();
  const key = [kind === "pull" ? "challenges" : "pushup-challenges"];
  return useMutation({
    mutationFn: ({ id, ...patch }) =>
      request(`/api/challenges/${id}`, { method: "PATCH", ...json(patch) }),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
}

export function useDeleteChallenge(kind) {
  const client = useQueryClient();
  const key = [kind === "pull" ? "challenges" : "pushup-challenges"];
  return useMutation({
    mutationFn: (id) => request(`/api/challenges/${id}`, { method: "DELETE" }),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
}
