// Data layer: Firebase Firestore only.
// Replaces the original Next.js server actions (saveJudge, savePerformance,
// saveScore, deleteScore, setGoldenTicket, setTopFivePerformances).
//
// Collections: judges, performances, scores, settings/state

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db, isConfigured } from "./firebase.js";
import { SEED_JUDGES, SEED_PERFORMANCES } from "./seed.js";

const STATE_REF = () => doc(db, "settings", "state");

// Editable event texts (Settings → Event). Defaults match the original site.
export const DEFAULT_EVENT = {
  eventLabel: "GX'27 Anniversary",
  appTitle: "Got Talent · Judging",
  systemLabel: "GX Got Talent · Judging System",
  auditionDate: "11 Nov 2026",
  auditionDescription: "Score 20 performances, review the audition leaderboard, and manage the Golden Ticket.",
  finalDate: "21 Nov 2026",
  finalDescription: "Fresh scoring for five finalists and the final Top 3 results.",
  top5Date: "12–13 November 2026",
};

const EMPTY_STATE = { goldenTicketId: null, topFiveIds: [], topFiveIsManual: false, event: DEFAULT_EVENT };

export function computeFinalScore(s) {
  return (0.3 * s.performanceQuality + 0.25 * s.creativity + 0.25 * s.entertainment + 0.2 * s.stagePresence) * 10;
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function scoreDocId(stage, judgeId, performanceId) {
  return `${stage === "Audition" ? "audition" : "final"}__${judgeId}__${performanceId}`;
}

function requireDb() {
  if (!db) throw new Error("Firebase is not configured. Add the VITE_FIREBASE_* environment variables in Vercel.");
  return db;
}

/* ------------------------------------------------------------------ */
/* First-run seed: fills an empty database with the 8 judges and       */
/* 20 performances from the original site. Fixed IDs keep it safe if   */
/* several devices open the app at the same time.                      */
/* ------------------------------------------------------------------ */

let seeding = false;
async function seedIfEmpty() {
  if (seeding) return;
  seeding = true;
  try {
    const [p, j] = await Promise.all([getDocs(collection(db, "performances")), getDocs(collection(db, "judges"))]);
    if (!p.empty || !j.empty) return;
    const batch = writeBatch(db);
    SEED_PERFORMANCES.forEach((x) => batch.set(doc(db, "performances", x.id), x));
    SEED_JUDGES.forEach((x) => batch.set(doc(db, "judges", x.id), x));
    batch.set(STATE_REF(), EMPTY_STATE, { merge: true });
    await batch.commit();
  } catch (e) {
    console.error("Seeding failed", e);
  } finally {
    seeding = false;
  }
}

/* ------------------------------------------------------------------ */
/* Live data hook (real-time across every judge's device)              */
/* ------------------------------------------------------------------ */

export function useJudgingData() {
  const [data, setData] = useState({
    judges: [],
    performances: [],
    scores: [],
    state: EMPTY_STATE,
    ready: false,
    error: isConfigured ? "" : "missing-config",
  });

  useEffect(() => {
    if (!isConfigured) {
      console.error("Firebase is not configured. Add the VITE_FIREBASE_* environment variables, then redeploy.");
      return;
    }
    const onError = (e) => {
      console.error(e);
      setData((d) => ({ ...d, error: e?.code || e?.message || "firestore-error" }));
    };
    seedIfEmpty();
    const unsubs = [
      onSnapshot(
        collection(db, "judges"),
        (snap) => setData((d) => ({ ...d, judges: snap.docs.map((x) => ({ id: x.id, ...x.data() })), ready: true, error: "" })),
        onError
      ),
      onSnapshot(
        collection(db, "performances"),
        (snap) => setData((d) => ({ ...d, performances: snap.docs.map((x) => ({ id: x.id, ...x.data() })) })),
        onError
      ),
      onSnapshot(
        collection(db, "scores"),
        (snap) => setData((d) => ({ ...d, scores: snap.docs.map((x) => ({ id: x.id, ...x.data() })) })),
        onError
      ),
      onSnapshot(STATE_REF(), (snap) => setData((d) => ({ ...d, state: { ...EMPTY_STATE, ...(snap.data() || {}) } })), onError),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const judges = [...data.judges].sort(
    (a, b) => Number(a.sortOrder) - Number(b.sortOrder) || String(a.stage).localeCompare(String(b.stage))
  );
  const performances = [...data.performances].sort((a, b) =>
    String(a.code).localeCompare(String(b.code), undefined, { numeric: true })
  );
  const judgeMap = new Map(data.judges.map((j) => [j.id, j]));
  const scores = data.scores.map((s) => ({ ...s, judgeName: judgeMap.get(s.judgeId)?.name ?? s.judgeName ?? "Unknown judge" }));

  return {
    ready: data.ready,
    error: data.error,
    judges,
    performances,
    scores,
    goldenTicketId: data.state.goldenTicketId ?? null,
    topFiveIds: data.state.topFiveIds ?? [],
    topFiveIsManual: Boolean(data.state.topFiveIsManual),
    event: { ...DEFAULT_EVENT, ...(data.state.event || {}) },
  };
}

/* ------------------------------------------------------------------ */
/* Actions (same names and return shape as the original)               */
/* ------------------------------------------------------------------ */

async function run(fn) {
  try {
    requireDb();
    return (await fn()) ?? { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, error: e?.code === "permission-denied" ? "Firestore rules blocked this change." : e?.message || "Something went wrong." };
  }
}

export function saveJudge(input) {
  return run(async () => {
    const name = String(input.name ?? "").trim();
    if (!name) return { ok: false, error: "Judge name is required." };
    const judge = {
      id: input.id || uid("judge"),
      name,
      stage: input.stage === "Top 5 Final" ? "Top 5 Final" : "Audition",
      active: Boolean(input.active),
      sortOrder: Number(input.sortOrder) || 1,
    };
    await setDoc(doc(db, "judges", judge.id), judge);
    return { ok: true };
  });
}

export function savePerformance(input, existing) {
  return run(async () => {
    const code = String(input.code ?? "").trim();
    const name = String(input.name ?? "").trim();
    if (!code || !name) return { ok: false, error: "Code and performance name are required." };
    const prevPerformers = existing?.performers ?? [];
    const names = String(input.performers ?? "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    const performers = names.map((n) => {
      const prev = prevPerformers.find((p) => p.name === n);
      return { name: n, division: prev ? prev.division : null };
    });
    const perf = {
      ...(existing ?? {}),
      id: input.id || uid("perf"),
      code,
      name,
      title: String(input.title ?? "").trim(),
      category: input.category,
      format: input.format,
      division: String(input.division ?? "").trim(),
      performers,
      pic: String(input.pic ?? "").trim(),
      performerCount:
        existing && existing.performers?.length === performers.length && existing.performerCount
          ? existing.performerCount
          : String(performers.length || 1),
      registrationType: existing?.registrationType ?? "Perwakilan Divisi",
    };
    await setDoc(doc(db, "performances", perf.id), perf);
    return { ok: true };
  });
}

export function saveScore(input) {
  return run(async () => {
    if (!input.judgeId || !input.performanceId) return { ok: false, error: "Select a judge and a performance." };
    const vals = ["performanceQuality", "creativity", "entertainment", "stagePresence"].map((k) => Number(input[k]));
    if (vals.some((v) => !Number.isFinite(v) || v < 1 || v > 10)) return { ok: false, error: "Scores must be 1–10." };
    const finalScore = Math.round(computeFinalScore(input) * 100) / 100;
    const score = {
      id: scoreDocId(input.stage, input.judgeId, input.performanceId),
      judgeId: input.judgeId,
      performanceId: input.performanceId,
      stage: input.stage === "Top 5 Final" ? "Top 5 Final" : "Audition",
      performanceQuality: vals[0],
      creativity: vals[1],
      entertainment: vals[2],
      stagePresence: vals[3],
      finalScore,
      notes: String(input.notes ?? "").trim(),
      nominated: Boolean(input.nominated),
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, "scores", score.id), score);
    return { ok: true, score: finalScore };
  });
}

export function deleteScore(id) {
  return run(async () => {
    await deleteDoc(doc(db, "scores", id));
    return { ok: true };
  });
}

export function deleteJudge(id) {
  return run(async () => {
    const batch = writeBatch(db);
    batch.delete(doc(db, "judges", id));
    (await getDocs(query(collection(db, "scores"), where("judgeId", "==", id)))).docs.forEach((s) => batch.delete(s.ref));
    await batch.commit();
    return { ok: true };
  });
}

export function deletePerformance(id) {
  return run(async () => {
    const batch = writeBatch(db);
    batch.delete(doc(db, "performances", id));
    (await getDocs(query(collection(db, "scores"), where("performanceId", "==", id)))).docs.forEach((s) =>
      batch.delete(s.ref)
    );
    const st = (await getDoc(STATE_REF())).data() || {};
    batch.set(
      STATE_REF(),
      {
        goldenTicketId: st.goldenTicketId === id ? null : st.goldenTicketId ?? null,
        topFiveIds: (st.topFiveIds || []).filter((x) => x !== id),
      },
      { merge: true }
    );
    await batch.commit();
    return { ok: true };
  });
}

export function saveEvent(event) {
  return run(async () => {
    const clean = Object.fromEntries(
      Object.keys(DEFAULT_EVENT).map((k) => [k, String(event[k] ?? "").trim() || DEFAULT_EVENT[k]])
    );
    await setDoc(STATE_REF(), { event: clean }, { merge: true });
    return { ok: true };
  });
}

export function setGoldenTicket(performanceId) {
  return run(async () => {
    await setDoc(STATE_REF(), { goldenTicketId: performanceId ?? null }, { merge: true });
    return { ok: true };
  });
}

export function setTopFivePerformances(ids) {
  return run(async () => {
    const unique = [...new Set(ids)].filter(Boolean);
    if (unique.length > 5) return { ok: false, error: "The Top 5 can hold at most five performances." };
    await setDoc(STATE_REF(), { topFiveIds: unique, topFiveIsManual: true }, { merge: true });
    return { ok: true };
  });
}
