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
  getDocsFromServer,
  getDocFromServer,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db, isConfigured } from "./firebase.js";
import { SEED_JUDGES, SEED_PERFORMANCES, RUNDOWN_VERSION, rundownPatch, registrationCodeFor } from "./seed.js";

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
/* First-run seed + data maintenance                                   */
/* ------------------------------------------------------------------ */

// The seed only runs on a brand-new database. Every read here goes to the
// server (getDocsFromServer / getDocFromServer): a device that is offline or
// still connecting gets an error instead of an empty cached result, so it can
// never mistake a full database for an empty one and add a second copy.
// Once settings/state exists, the database counts as set up and is never seeded again.
let running = false;
async function prepareDatabase() {
  if (running) return;
  running = true;
  try {
    const stateSnap = await getDocFromServer(STATE_REF());
    const [p, j, sc] = await Promise.all([
      getDocsFromServer(collection(db, "performances")),
      getDocsFromServer(collection(db, "judges")),
      getDocsFromServer(collection(db, "scores")),
    ]);
    if (!stateSnap.exists() && p.empty && j.empty) {
      const batch = writeBatch(db);
      SEED_PERFORMANCES.forEach((x) => batch.set(doc(db, "performances", x.id), x));
      SEED_JUDGES.forEach((x) => batch.set(doc(db, "judges", x.id), x));
      batch.set(STATE_REF(), { ...EMPTY_STATE, rundownVersion: RUNDOWN_VERSION }, { merge: true });
      await batch.commit();
      return;
    }
    const state = stateSnap.data() || {};
    if ((state.rundownVersion ?? 0) < RUNDOWN_VERSION) await applyRundown(p.docs, j.docs, sc.docs, state);
  } catch (e) {
    console.warn("[GX Judging] Database check skipped (offline or not reachable).", e?.code || e);
  } finally {
    running = false;
  }
}

const SEED_ID = /^(p\d{2}|judge-\d{2})$/;

// Picks which copy of a duplicated record to keep: the one with scores first,
// then the original (non-seed) document.
function pickKeeper(docs, scoreCount) {
  return [...docs].sort(
    (a, b) => (scoreCount(b.id) > 0) - (scoreCount(a.id) > 0) || SEED_ID.test(a.id) - SEED_ID.test(b.id)
  )[0];
}

// Applies the current audition rundown (order P01–P20, names, session, slot,
// standby, details, division) and removes duplicate copies of the same
// performance or judge. A duplicate is only deleted when no score uses it.
// Performances added later through Settings (no registration code) are left alone.
async function applyRundown(perfDocs, judgeDocs, scoreDocs, state) {
  const scoresFor = (field) => (id) => scoreDocs.filter((s) => s.data()[field] === id).length;
  const perfScores = scoresFor("performanceId");
  const judgeScores = scoresFor("judgeId");
  const batch = writeBatch(db);
  let updated = 0;
  let removed = 0;

  const byReg = new Map();
  perfDocs.forEach((d) => {
    const reg = registrationCodeFor(d.data(), d.id);
    if (!reg || !rundownPatch(reg)) return;
    byReg.set(reg, [...(byReg.get(reg) ?? []), d]);
  });
  const removedPerfIds = [];
  byReg.forEach((docs, reg) => {
    const keep = pickKeeper(docs, perfScores);
    batch.set(keep.ref, rundownPatch(reg), { merge: true });
    updated += 1;
    docs
      .filter((d) => d.id !== keep.id && perfScores(d.id) === 0)
      .forEach((d) => {
        batch.delete(d.ref);
        removedPerfIds.push(d.id);
        removed += 1;
      });
  });

  const byJudge = new Map();
  judgeDocs.forEach((d) => {
    const key = `${String(d.data().name ?? "").trim().toLowerCase()}|${d.data().stage}`;
    byJudge.set(key, [...(byJudge.get(key) ?? []), d]);
  });
  byJudge.forEach((docs) => {
    if (docs.length < 2) return;
    const keep = pickKeeper(docs, judgeScores);
    docs
      .filter((d) => d.id !== keep.id && judgeScores(d.id) === 0)
      .forEach((d) => {
        batch.delete(d.ref);
        removed += 1;
      });
  });

  const statePatch = {};
  if (removedPerfIds.includes(state.goldenTicketId)) statePatch.goldenTicketId = null;
  if ((state.topFiveIds ?? []).some((id) => removedPerfIds.includes(id)))
    statePatch.topFiveIds = state.topFiveIds.filter((id) => !removedPerfIds.includes(id));
  // Only mark the update as done when it matched performances, so a database
  // that matches nothing is retried instead of skipped forever.
  if (updated) statePatch.rundownVersion = RUNDOWN_VERSION;
  if (Object.keys(statePatch).length) batch.set(STATE_REF(), statePatch, { merge: true });
  await batch.commit();
  console.info(`[GX Judging] Rundown applied to ${updated} performances, ${removed} duplicates removed.`);
}

// Safety net for the screen: never show two copies of the same performance
// or judge, even before the cleanup above has run.
function uniqueBy(items, keyOf) {
  const seen = new Map();
  items.forEach((x) => {
    const key = keyOf(x);
    if (!key) return seen.set(Symbol(), x);
    const prev = seen.get(key);
    if (!prev || (SEED_ID.test(prev.id) && !SEED_ID.test(x.id))) seen.set(key, x);
  });
  return [...seen.values()];
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
    prepareDatabase();
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

  const judges = uniqueBy(data.judges, (j) => `${String(j.name ?? "").trim().toLowerCase()}|${j.stage}`).sort(
    (a, b) => Number(a.sortOrder) - Number(b.sortOrder) || String(a.stage).localeCompare(String(b.stage))
  );
  const performances = uniqueBy(data.performances, (p) => p.registrationCode).sort((a, b) =>
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
      details: String(input.details ?? "").trim(),
      session: String(input.session ?? "").trim(),
      slotTime: String(input.slotTime ?? "").trim(),
      standbyTime: String(input.standbyTime ?? "").trim(),
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
