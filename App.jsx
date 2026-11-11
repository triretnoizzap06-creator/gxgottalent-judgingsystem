import { useEffect, useMemo, useState, useTransition } from "react";
import globalxtremeLogo from "./globalxtreme-logo.png";
import {
  useJudgingData,
  computeFinalScore,
  deleteScore,
  deleteJudge,
  deletePerformance,
  saveEvent,
  DEFAULT_EVENT,
  saveJudge,
  savePerformance,
  saveScore,
  setGoldenTicket,
  setTopFivePerformances,
} from "./store.js";

/* ------------------------------------------------------------------ */
/* Constants & helpers                                                 */
/* ------------------------------------------------------------------ */

export const CATEGORIES = ["Band", "Dance", "Singing / Vocal", "Theater / Acting", "Pertunjukan Tradisional", "Lainnya"];

const CRITERIA = [
  { key: "performanceQuality", short: "PQ", label: "Performance Quality", weight: "30%", help: "Technique, vocals/movement, and preparation", tone: "bg-[#FFF0A6]" },
  { key: "creativity", short: "CO", label: "Creativity & Originality", weight: "25%", help: "Concept uniqueness and originality", tone: "bg-[#CEC3FA]" },
  { key: "entertainment", short: "EV", label: "Entertainment Value", weight: "25%", help: "Audience engagement and entertainment", tone: "bg-[#B8CCFF]" },
  { key: "stagePresence", short: "SP", label: "Stage Presence", weight: "20%", help: "Confidence, expression, energy, and command", tone: "bg-[#C5F3CE]" },
];

function scoringViewFor(stage) {
  return stage === "Audition" ? "scoring-audition" : "scoring-final";
}
function isScoringView(view) {
  return view === "scoring-audition" || view === "scoring-final";
}
export function categoryLabel(c) {
  return c === "Pertunjukan Tradisional" ? "Traditional Performance" : c === "Lainnya" ? "Other" : c;
}
export function divisionLabel(p) {
  if (p.division?.trim()) return p.division.trim();
  const divs = [...new Set((p.performers ?? []).map((x) => x.division?.trim()).filter((x) => !!x))];
  return divs.length > 1 ? `Mixed divisions · ${divs.join(", ")}` : divs[0] ?? p.division;
}

export function buildRows(performances, scores, goldenTicketId) {
  return performances
    .map((p) => {
      const s = scores.filter((x) => x.performanceId === p.id);
      const avg = (k) => (s.length ? s.reduce((t, x) => t + Number(x[k] ?? 0), 0) / s.length : 0);
      return {
        performance: p,
        judgeCount: s.length,
        score: avg("finalScore"),
        pq: avg("performanceQuality"),
        co: avg("creativity"),
        ev: avg("entertainment"),
        sp: avg("stagePresence"),
        nominatedBy: s.filter((x) => x.nominated).map((x) => x.judgeName),
      };
    })
    .sort((a, b) =>
      a.performance.id === goldenTicketId
        ? -1
        : b.performance.id === goldenTicketId
          ? 1
          : b.score - a.score || b.pq - a.pq || b.co - a.co || b.ev - a.ev
    );
}

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

function TicketIcon({ className = "size-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 3h14v5a3 3 0 0 0 0 6v5H5v-5a3 3 0 0 0 0-6V3Z" />
      <path d="M12 7v2m0 2v2m0 2v2" />
    </svg>
  );
}
function ArrowIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}
function MicIcon() {
  return (
    <svg className="size-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="8" y="3" width="8" height="12" rx="4" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" />
    </svg>
  );
}
function TrophyIcon() {
  return (
    <svg className="size-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 13v5M8 21h8M9 18h6" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

function PageTitle({ eyebrow, title, copy }) {
  return (
    <div className="mb-8">
      <p className="mb-4 inline-flex rounded-full bg-[#FFF0A6] px-3 py-2 text-[10px] font-black uppercase tracking-[.22em]">{eyebrow}</p>
      <h1 className="text-4xl font-black uppercase tracking-[-.055em] sm:text-6xl">{title}</h1>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-[#666666]">{copy}</p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-2">
      <span className="text-[10px] font-black uppercase tracking-[.16em] text-[#777777]">{label}</span>
      {children}
    </label>
  );
}

function StatCard({ label, value, accent = false }) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? "border-[#FFEC6B] bg-[#FFF0A6]" : "border-[#E4E4E4] bg-white"}`}>
      <p className="text-[10px] font-black uppercase tracking-[.15em] text-[#777777]">{label}</p>
      <p className="mt-2 truncate text-2xl font-black">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-wider text-[#999999]">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}

function StatusPill({ golden, count, total }) {
  return golden ? (
    <span className="rounded-full bg-[#FFEC6B] px-2.5 py-1.5 text-[9px] font-black">GOLDEN TICKET</span>
  ) : (
    <span
      className={`rounded-full px-2.5 py-1.5 text-[9px] font-black ${
        total > 0 && count === total ? "bg-[#C5F3CE] text-[#185C28]" : "bg-[#F1F1ED] text-[#777777]"
      }`}
    >
      {count ? `SCORED ${count}/${total}` : "NOT SCORED"}
    </span>
  );
}

function EmptyState({ icon, title, copy }) {
  return (
    <div className="grid min-h-64 place-items-center rounded-3xl border border-dashed border-[#D8D8D8] bg-white p-8 text-center">
      <div>
        {icon && <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-[#F1F1ED]">{icon}</div>}
        <h3 className="font-black">{title}</h3>
        <p className="mt-2 text-sm text-[#777777]">{copy}</p>
      </div>
    </div>
  );
}

function ConfirmButton({ onConfirm, disabled, className, label = "Delete", confirmLabel = "Confirm delete" }) {
  const [armed, setArmed] = useState(false);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
          window.setTimeout(() => setArmed(false), 4000);
        }
      }}
      className={className}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

function Dashboard({ event, judges, performances, auditionComplete, finalComplete, goldenTicketName, finalistCount, onOpen, onManage }) {
  const cards = [
    {
      stage: "Audition",
      title: "Audition",
      description: event.auditionDescription,
      date: event.auditionDate,
      icon: <MicIcon />,
      tone: "bg-[#FFEC6B]",
      count: performances.length,
      complete: auditionComplete,
      judges: judges.filter((j) => j.stage === "Audition" && j.active).length,
      status: goldenTicketName ? `GT · ${goldenTicketName}` : "Golden Ticket not awarded yet",
    },
    {
      stage: "Top 5 Final",
      title: "Top 5 Final",
      description: event.finalDescription,
      date: event.finalDate,
      icon: <TrophyIcon />,
      tone: "bg-[#CEC3FA]",
      count: finalistCount,
      complete: finalComplete,
      judges: judges.filter((j) => j.stage === "Top 5 Final" && j.active).length,
      status: `${finalistCount}/5 finalists ready`,
    },
  ];

  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[.2em] text-[#777777]">{event.systemLabel}</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-.04em] sm:text-5xl">Choose a Dashboard</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#666666]">
            Choose a stage to open. After selection, the navigation only shows tools for that stage.
          </p>
        </div>
        <button
          onClick={onManage}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D8D8D8] bg-white px-5 py-3 text-xs font-black uppercase tracking-wider"
        >
          <PlusIcon /> Manage Data
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <button
            key={c.stage}
            onClick={() => onOpen(c.stage)}
            className="group rounded-2xl border border-[#CFCFCF] bg-white p-5 text-left transition hover:-translate-y-1 hover:border-[#111111] hover:shadow-xl hover:shadow-black/5 sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <span className={`grid size-16 place-items-center rounded-full ${c.tone}`}>{c.icon}</span>
              <span className="rounded-full bg-[#F1F1ED] px-3 py-2 text-[10px] font-black uppercase tracking-wider">{c.date}</span>
            </div>
            <h2 className="mt-8 text-2xl font-black tracking-[-.03em]">{c.title}</h2>
            <p className="mt-2 min-h-10 text-sm leading-5 text-[#666666]">{c.description}</p>
            <div className="mt-6 grid grid-cols-3 gap-3 border-y border-[#E4E4E4] py-4">
              <MiniStat label="Performances" value={String(c.count)} />
              <MiniStat label="Completed" value={String(c.complete)} />
              <MiniStat label="Judges" value={String(c.judges)} />
            </div>
            <div className="mt-5 flex items-center justify-between gap-4">
              <span className="truncate text-xs text-[#777777]">{c.status}</span>
              <span className="inline-flex shrink-0 items-center gap-2 text-xs font-black uppercase tracking-wider">
                Open <ArrowIcon />
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* History                                                             */
/* ------------------------------------------------------------------ */

function History({ scores, performances, stage, pending, onAdd, onEdit, onDelete, onExport }) {
  const list = [...scores].sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
  return (
    <section>
      <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <PageTitle
          eyebrow={`${stage} · Audit trail`}
          title="SCORE HISTORY"
          copy="Review every submitted score. Adding or deleting a record immediately recalculates rankings and final results."
        />
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={onExport}
            className="rounded-xl border border-[#D8D8D8] bg-white px-5 py-3 text-xs font-black uppercase tracking-wider"
          >
            Export Excel
          </button>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-[#111111] px-5 py-3 text-xs font-black uppercase tracking-wider text-white"
          >
            <PlusIcon /> Add score
          </button>
        </div>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Stage" value={stage} />
        <StatCard label="Score records" value={String(list.length)} />
        <StatCard
          label="Average"
          value={list.length ? (list.reduce((t, s) => t + s.finalScore, 0) / list.length).toFixed(1) : "—"}
          accent
        />
      </div>
      {list.length ? (
        <div className="space-y-3">
          {list.map((s) => {
            const p = performances.find((x) => x.id === s.performanceId);
            return (
              <article key={s.id} className="rounded-2xl border border-[#E4E4E4] bg-white p-4 sm:p-5">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-[#F1F1ED] px-2 py-1 text-[9px] font-black uppercase">{p?.code ?? "Unknown"}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#777777]">{s.judgeName}</span>
                      {s.createdAt && (
                        <span className="text-[10px] text-[#999999]">
                          {new Date(s.createdAt).toLocaleString("en-GB", {
                            timeZone: "Asia/Makassar",
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      )}
                    </div>
                    <h2 className="mt-2 truncate text-lg font-black">{p?.name ?? "Deleted performance"}</h2>
                    <p className="mt-1 text-xs text-[#777777]">{p ? divisionLabel(p) : "Division unavailable"}</p>
                    {s.notes && <p className="mt-3 line-clamp-2 text-xs leading-5 text-[#666666]">{s.notes}</p>}
                  </div>
                  <div className="flex items-center justify-between gap-4 lg:justify-end">
                    <div className="flex gap-1.5">
                      {[
                        ["PQ", s.performanceQuality],
                        ["CO", s.creativity],
                        ["EV", s.entertainment],
                        ["SP", s.stagePresence],
                      ].map(([k, v]) => (
                        <span key={String(k)} className="rounded-lg bg-[#F8F8F5] px-2.5 py-2 text-[9px] font-black">
                          {k} {v}
                        </span>
                      ))}
                    </div>
                    <p className="min-w-16 text-right text-3xl font-black">{s.finalScore.toFixed(1)}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(s)}
                        disabled={pending || !p}
                        className="rounded-xl border border-[#D8D8D8] bg-white px-4 py-3 text-[10px] font-black uppercase tracking-wider disabled:opacity-30"
                      >
                        Edit
                      </button>
                      <ConfirmButton
                        onConfirm={() => onDelete(s.id)}
                        disabled={pending}
                        className="rounded-xl border border-[#FFC7C4] bg-[#FFF4F2] px-4 py-3 text-[10px] font-black uppercase tracking-wider text-[#A32222] disabled:opacity-30"
                      />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No score history yet" copy="Use Add score to submit the first record for this stage." />
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

function Settings({ event, judges, performances, onSaved }) {
  const [tab, setTab] = useState("judges");
  const blankJudge = () => ({ id: "", name: "", stage: "Audition", active: true, sortOrder: judges.length + 1 });
  const blankPerf = () => ({
    id: "",
    code: `P${String(performances.length + 1).padStart(2, "0")}`,
    name: "",
    title: "",
    category: "Singing / Vocal",
    format: "Individu",
    division: "",
    details: "",
    session: "",
    slotTime: "",
    standbyTime: "",
    performers: "",
    pic: "",
  });
  const [judge, setJudge] = useState(blankJudge);
  const [perf, setPerf] = useState(blankPerf);
  const [eventForm, setEventForm] = useState(event);
  const eventKey = JSON.stringify(event);
  useEffect(() => setEventForm(JSON.parse(eventKey)), [eventKey]);
  const [pending, startTransition] = useTransition();

  function remove(fn, id, message, reset) {
    startTransition(async () => {
      const r = await fn(id);
      if (r.ok) {
        onSaved(message);
        reset();
      } else onSaved(r.error ?? "Could not delete.");
    });
  }

  const EVENT_FIELDS = [
    ["eventLabel", "Header · event label"],
    ["appTitle", "Header · app title"],
    ["systemLabel", "Dashboard · eyebrow"],
    ["auditionDate", "Audition · date"],
    ["auditionDescription", "Audition · description", true],
    ["finalDate", "Top 5 Final · date"],
    ["finalDescription", "Top 5 Final · description", true],
    ["top5Date", "Top 5 Curation · date label"],
  ];

  return (
    <section>
      <PageTitle
        eyebrow="Data Management"
        title="SETTINGS"
        copy="Add or edit judges and performances. Changes are immediately available in the scoring form."
      />
      <div className="mb-6 flex gap-2">
        {["judges", "performances", "event"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-5 py-3 text-xs font-black uppercase tracking-wider ${
              tab === t ? "bg-[#111111] text-white" : "border border-[#D8D8D8] bg-white"
            }`}
          >
            {t === "judges" ? "Judges" : t === "performances" ? "Performances" : "Event"}
          </button>
        ))}
      </div>

      {tab === "event" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const r = await saveEvent(eventForm);
              onSaved(r.ok ? "Event details updated." : r.error ?? "Could not save the event details.");
            });
          }}
          className="max-w-3xl rounded-3xl border border-[#E4E4E4] bg-white p-6"
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-black">Event Details</h2>
            <button type="button" onClick={() => setEventForm(DEFAULT_EVENT)} className="text-xs font-bold text-[#777777]">
              Reset to default
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {EVENT_FIELDS.map(([key, label, wide]) => (
              <div key={key} className={wide ? "sm:col-span-2" : ""}>
                <Field label={label}>
                  {wide ? (
                    <textarea
                      id={`event-${key}`}
                      className="field min-h-20 resize-none"
                      value={eventForm[key]}
                      onChange={(e) => setEventForm({ ...eventForm, [key]: e.target.value })}
                    />
                  ) : (
                    <input
                      id={`event-${key}`}
                      className="field"
                      value={eventForm[key]}
                      onChange={(e) => setEventForm({ ...eventForm, [key]: e.target.value })}
                    />
                  )}
                </Field>
              </div>
            ))}
            <button
              disabled={pending}
              className="sm:col-span-2 w-full rounded-xl bg-[#FFEC6B] px-5 py-4 text-xs font-black uppercase tracking-wider"
            >
              {pending ? "Saving…" : "Save Event Details"}
            </button>
          </div>
        </form>
      ) : tab === "judges" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="overflow-hidden rounded-3xl border border-[#E4E4E4] bg-white">
            <div className="border-b border-[#E4E4E4] bg-[#F8F8F5] px-5 py-4 text-xs font-black uppercase tracking-wider">
              {judges.length} Judges
            </div>
            <div className="divide-y divide-[#EDEDED]">
              {judges.map((j) => (
                <div key={j.id} className="flex items-center justify-between gap-4 p-5">
                  <div>
                    <p className="font-black">{j.name}</p>
                    <p className="mt-1 text-xs text-[#777777]">
                      {j.stage} · Order {j.sortOrder} · {j.active ? "Active" : "Inactive"}
                    </p>
                  </div>
                  <button
                    onClick={() => setJudge({ id: j.id, name: j.name, stage: j.stage, active: j.active, sortOrder: j.sortOrder })}
                    className="rounded-full border border-[#D8D8D8] px-4 py-2 text-xs font-bold"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const r = await saveJudge({ ...judge, id: judge.id || undefined });
                if (r.ok) {
                  onSaved(judge.id ? "Judge updated." : "Judge added.");
                  setJudge(blankJudge());
                } else onSaved(r.error ?? "Could not save the judge.");
              });
            }}
            className="h-fit rounded-3xl border border-[#E4E4E4] bg-white p-6"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-black">{judge.id ? "Edit Judge" : "Add Judge"}</h2>
              {judge.id && (
                <button type="button" onClick={() => setJudge(blankJudge())} className="text-xs font-bold text-[#777777]">
                  Cancel
                </button>
              )}
            </div>
            <div className="space-y-4">
              <Field label="Full name">
                <input className="field" value={judge.name} onChange={(e) => setJudge({ ...judge, name: e.target.value })} />
              </Field>
              <Field label="Stage">
                <select className="field" value={judge.stage} onChange={(e) => setJudge({ ...judge, stage: e.target.value })}>
                  <option>Audition</option>
                  <option>Top 5 Final</option>
                </select>
              </Field>
              <Field label="Display order">
                <input
                  className="field"
                  type="number"
                  min="1"
                  value={judge.sortOrder}
                  onChange={(e) => setJudge({ ...judge, sortOrder: Number(e.target.value) })}
                />
              </Field>
              <label className="flex items-center gap-3 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={judge.active}
                  onChange={(e) => setJudge({ ...judge, active: e.target.checked })}
                  className="size-4 accent-black"
                />{" "}
                Active judge
              </label>
              <button disabled={pending} className="w-full rounded-xl bg-[#FFEC6B] px-5 py-4 text-xs font-black uppercase tracking-wider">
                {pending ? "Saving…" : "Save Judge"}
              </button>
              {judge.id && (
                <ConfirmButton
                  disabled={pending}
                  label="Delete Judge"
                  confirmLabel="Confirm — also deletes this judge's scores"
                  onConfirm={() => remove(deleteJudge, judge.id, "Judge deleted.", () => setJudge(blankJudge()))}
                  className="w-full rounded-xl border border-[#FFC7C4] bg-[#FFF4F2] px-5 py-4 text-xs font-black uppercase tracking-wider text-[#A32222] disabled:opacity-30"
                />
              )}
            </div>
          </form>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_460px]">
          <div className="overflow-hidden rounded-3xl border border-[#E4E4E4] bg-white">
            <div className="border-b border-[#E4E4E4] bg-[#F8F8F5] px-5 py-4 text-xs font-black uppercase tracking-wider">
              {performances.length} Performances
            </div>
            <div className="max-h-[760px] divide-y divide-[#EDEDED] overflow-y-auto">
              {performances.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-4 p-5">
                  <div>
                    <p className="font-black">
                      {p.code} · {p.name}
                    </p>
                    <p className="mt-1 text-xs text-[#777777]">
                      {p.slotTime ? `${p.slotTime} · ` : ""}
                      {p.details || categoryLabel(p.category)} · {divisionLabel(p)}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setPerf({
                        id: p.id,
                        code: p.code,
                        name: p.name,
                        title: p.title,
                        category: p.category,
                        format: p.format,
                        division: p.division ?? "",
                        details: p.details ?? "",
                        session: p.session ?? "",
                        slotTime: p.slotTime ?? "",
                        standbyTime: p.standbyTime ?? "",
                        performers: (p.performers ?? []).map((x) => x.name).join(", "),
                        pic: p.pic,
                      })
                    }
                    className="rounded-full border border-[#D8D8D8] px-4 py-2 text-xs font-bold"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const existing = performances.find((x) => x.id === perf.id);
                const r = await savePerformance({ ...perf, id: perf.id || undefined }, existing);
                if (r.ok) {
                  onSaved(perf.id ? "Performance updated." : "Performance added.");
                  setPerf(blankPerf());
                } else onSaved(r.error ?? "Could not save the performance.");
              });
            }}
            className="h-fit rounded-3xl border border-[#E4E4E4] bg-white p-6"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-black">{perf.id ? "Edit Performance" : "Add Performance"}</h2>
              {perf.id && (
                <button type="button" onClick={() => setPerf(blankPerf())} className="text-xs font-bold text-[#777777]">
                  Cancel
                </button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Code">
                <input className="field" value={perf.code} onChange={(e) => setPerf({ ...perf, code: e.target.value })} />
              </Field>
              <Field label="Format">
                <select className="field" value={perf.format} onChange={(e) => setPerf({ ...perf, format: e.target.value })}>
                  <option value="Individu">Individual</option>
                  <option value="Grup">Group</option>
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Performance name">
                  <input className="field" value={perf.name} onChange={(e) => setPerf({ ...perf, name: e.target.value })} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Talent / title">
                  <input className="field" value={perf.title} onChange={(e) => setPerf({ ...perf, title: e.target.value })} />
                </Field>
              </div>
              <Field label="Category">
                <select className="field" value={perf.category} onChange={(e) => setPerf({ ...perf, category: e.target.value })}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {categoryLabel(c)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Performance details">
                <input
                  className="field"
                  placeholder="e.g. Choir & Dance"
                  value={perf.details}
                  onChange={(e) => setPerf({ ...perf, details: e.target.value })}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Division">
                  <input className="field" value={perf.division} onChange={(e) => setPerf({ ...perf, division: e.target.value })} />
                </Field>
              </div>
              <Field label="Session">
                <select className="field" value={perf.session} onChange={(e) => setPerf({ ...perf, session: e.target.value })}>
                  <option value="">—</option>
                  <option>Session 01</option>
                  <option>Session 02</option>
                </select>
              </Field>
              <Field label="Slot time">
                <input
                  className="field"
                  placeholder="17.00–17.10"
                  value={perf.slotTime}
                  onChange={(e) => setPerf({ ...perf, slotTime: e.target.value })}
                />
              </Field>
              <Field label="Standby time">
                <input
                  className="field"
                  placeholder="16.50"
                  value={perf.standbyTime}
                  onChange={(e) => setPerf({ ...perf, standbyTime: e.target.value })}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Performers (comma-separated)">
                  <textarea
                    className="field min-h-20 resize-none"
                    value={perf.performers}
                    onChange={(e) => setPerf({ ...perf, performers: e.target.value })}
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="PIC">
                  <input className="field" value={perf.pic} onChange={(e) => setPerf({ ...perf, pic: e.target.value })} />
                </Field>
              </div>
              <button
                disabled={pending}
                className="sm:col-span-2 w-full rounded-xl bg-[#FFEC6B] px-5 py-4 text-xs font-black uppercase tracking-wider"
              >
                {pending ? "Saving…" : "Save Performance"}
              </button>
              {perf.id && (
                <ConfirmButton
                  disabled={pending}
                  label="Delete Performance"
                  confirmLabel="Confirm — also deletes its scores"
                  onConfirm={() => remove(deletePerformance, perf.id, "Performance deleted.", () => setPerf(blankPerf()))}
                  className="sm:col-span-2 w-full rounded-xl border border-[#FFC7C4] bg-[#FFF4F2] px-5 py-4 text-xs font-black uppercase tracking-wider text-[#A32222] disabled:opacity-30"
                />
              )}
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Scoring: performance card                                           */
/* ------------------------------------------------------------------ */

function PerformanceCard({ performance: p }) {
  const fmt = p.format === "Individu" ? "Individual" : p.format === "Grup" ? "Group" : p.format;
  const people = p.performers ?? [];
  return (
    <article className="overflow-hidden rounded-3xl border border-[#E4E4E4] bg-white">
      <div className="border-b border-[#E4E4E4] p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-md bg-[#FFEC6B] px-2 py-1 text-[10px] font-black">{p.code}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#777777]">{categoryLabel(p.category)}</span>
              {p.details && (
                <span className="rounded-md bg-[#F1F1ED] px-2 py-1 text-[10px] font-black uppercase tracking-wider">{p.details}</span>
              )}
            </div>
            <h2 className="text-2xl font-black tracking-tight">{p.name}</h2>
            <p className="mt-2 text-sm text-[#666666]">{p.title}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#777777]">Representing</p>
            <p className="mt-2 max-w-72 text-sm font-bold">{divisionLabel(p)}</p>
          </div>
        </div>
      </div>
      <div className="grid gap-5 p-6 sm:grid-cols-[1fr_auto]">
        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#777777]">Performers</p>
          <div className="flex flex-wrap gap-2">
            {people.slice(0, 6).map((x, i) => (
              <span key={`${x.name}-${i}`} className="rounded-full border border-[#E4E4E4] bg-[#F8F8F5] px-3 py-1.5 text-xs">
                {x.name}
              </span>
            ))}
            {people.length > 6 && (
              <span className="rounded-full bg-[#E9E9E4] px-3 py-1.5 text-xs font-bold">+{people.length - 6} more</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-4 sm:border-l sm:border-[#E4E4E4] sm:pl-7">
          <MiniStat label="Format" value={fmt} />
          <MiniStat label="Count" value={p.performerCount} />
          {p.slotTime && <MiniStat label={p.session ? `${p.session} · Slot` : "Slot"} value={p.slotTime} />}
          {p.standbyTime && <MiniStat label="Standby" value={p.standbyTime} />}
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Leaderboard                                                         */
/* ------------------------------------------------------------------ */

function LeaderboardTable({ rows, judgeTotal, goldenTicketId }) {
  return (
    <div>
      <div className="space-y-3 md:hidden">
        {rows.map((r, i) => {
          const gold = r.performance.id === goldenTicketId;
          return (
            <article
              key={r.performance.id}
              className={`overflow-hidden rounded-2xl border ${gold ? "border-[#FFEC6B] bg-[#FFF0A6]" : "border-[#E4E4E4] bg-white"}`}
            >
              <div className="flex items-start gap-4 p-4">
                <span
                  className={`grid size-11 shrink-0 place-items-center rounded-xl text-lg font-black ${
                    i === 0 ? "bg-[#FFEC6B]" : i === 1 ? "bg-[#B8CCFF]" : i === 2 ? "bg-[#FFC7C4]" : "bg-[#F1F1ED]"
                  }`}
                >
                  {gold ? <TicketIcon /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">
                        {r.performance.code} · {r.performance.name}
                      </p>
                      <p className="mt-1 truncate text-xs text-[#777777]">{divisionLabel(r.performance)}</p>
                    </div>
                    <p className="text-2xl font-black">{r.score ? r.score.toFixed(1) : "—"}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {[
                      ["PQ", r.pq],
                      ["CO", r.co],
                      ["EV", r.ev],
                      ["SP", r.sp],
                    ].map(([k, v]) => (
                      <span key={String(k)} className="rounded-full bg-[#F1F1ED] px-2.5 py-1 text-[9px] font-black">
                        {k} {Number(v) ? Number(v).toFixed(1) : "—"}
                      </span>
                    ))}
                    <StatusPill golden={gold} count={r.judgeCount} total={judgeTotal} />
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <div className="hidden overflow-hidden rounded-3xl border border-[#E4E4E4] bg-white md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="border-b border-[#E4E4E4] bg-[#F8F8F5] text-[10px] font-black uppercase tracking-[.15em] text-[#777777]">
              <tr>
                <th className="px-5 py-4">Rank</th>
                <th className="px-5 py-4">Performance</th>
                <th className="px-5 py-4">Division</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-3 py-4">PQ</th>
                <th className="px-3 py-4">CO</th>
                <th className="px-3 py-4">EV</th>
                <th className="px-3 py-4">SP</th>
                <th className="px-5 py-4 text-right">Score</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDEDED]">
              {rows.map((r, i) => {
                const gold = r.performance.id === goldenTicketId;
                return (
                  <tr key={r.performance.id} className={gold ? "bg-[#FFF0A6]" : i < 5 ? "bg-[#FAFAF8]" : ""}>
                    <td className="px-5 py-4">
                      {gold ? (
                        <TicketIcon className="size-6" />
                      ) : (
                        <span className="font-black text-[#666666]">{String(i + 1).padStart(2, "0")}</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold">
                        {r.performance.code} · {r.performance.name}
                      </p>
                      <p className="mt-1 max-w-64 truncate text-xs text-[#777777]">{r.performance.title}</p>
                    </td>
                    <td className="max-w-48 px-5 py-4 text-xs text-[#666666]">{divisionLabel(r.performance)}</td>
                    <td className="px-5 py-4 text-xs">
                      {categoryLabel(r.performance.category)}
                      {r.performance.details && <p className="mt-1 text-[#777777]">{r.performance.details}</p>}
                    </td>
                    {[r.pq, r.co, r.ev, r.sp].map((v, k) => (
                      <td key={k} className="px-3 py-4 text-xs tabular-nums text-[#777777]">
                        {v ? v.toFixed(1) : "—"}
                      </td>
                    ))}
                    <td className="px-5 py-4 text-right text-xl font-black tabular-nums">{r.score ? r.score.toFixed(1) : "—"}</td>
                    <td className="px-5 py-4">
                      <StatusPill golden={gold} count={r.judgeCount} total={judgeTotal} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ResultsHero({ stage, judgeCount }) {
  return (
    <div className="relative mb-6 overflow-hidden rounded-[2rem] bg-[#CEC3FA] p-6 sm:p-8 lg:p-10">
      <div className="absolute -right-8 -top-12 size-40 rounded-full bg-[#FFEC6B]" />
      <div className="absolute -bottom-12 right-32 size-28 rounded-full bg-[#FFC7C4]" />
      <div className="absolute right-8 top-20 size-5 rotate-12 bg-[#111111]" />
      <div className="relative">
        <p className="mb-4 inline-flex rounded-full bg-white/70 px-3 py-2 text-[10px] font-black uppercase tracking-[.2em]">
          {stage} · Live Results
        </p>
        <h1 className="max-w-3xl text-4xl font-black uppercase leading-[.9] tracking-[-.06em] sm:text-6xl lg:text-7xl">
          Talent
          <br />
          takes the lead.
        </h1>
        <p className="mt-5 max-w-lg text-sm font-semibold text-[#444444]">
          Rankings are based on the average score from {judgeCount} active judges and update whenever a score is saved.
        </p>
      </div>
    </div>
  );
}

function Podium({ rows }) {
  const top = rows.slice(0, 3);
  if (!top.length) return null;
  const ordered = top.length === 3 ? [top[1], top[0], top[2]] : top;
  return (
    <div className="mb-6 grid gap-3 md:grid-cols-3 md:items-end">
      {ordered.map((r) => {
        const rank = rows.findIndex((x) => x.performance.id === r.performance.id) + 1;
        const tone = rank === 1 ? "bg-[#FFEC6B] md:-translate-y-4" : rank === 2 ? "bg-[#B8CCFF]" : "bg-[#FFC7C4]";
        return (
          <article key={r.performance.id} className={`relative overflow-hidden rounded-3xl border border-[#111111]/10 p-5 ${tone}`}>
            <span className="absolute right-4 top-3 text-6xl font-black opacity-10">0{rank}</span>
            <p className="text-[10px] font-black uppercase tracking-[.18em]">Rank {rank}</p>
            <h2 className="relative mt-8 line-clamp-2 text-xl font-black leading-tight">{r.performance.name}</h2>
            <p className="mt-2 truncate text-xs font-semibold opacity-60">{categoryLabel(r.performance.category)}</p>
            <div className="mt-6 flex items-end justify-between border-t border-[#111111]/10 pt-4">
              <span className="text-[10px] font-black uppercase tracking-wider">{r.judgeCount} judges</span>
              <span className="text-4xl font-black tracking-[-.06em]">{r.score ? r.score.toFixed(1) : "—"}</span>
            </div>
          </article>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Connection problem screen                                           */
/* ------------------------------------------------------------------ */

function ConnectionNotice({ error }) {
  const missing = error === "missing-config";
  const denied = error === "permission-denied";
  return (
    <main className="grid min-h-screen place-items-center bg-[#F8F8F5] p-6 text-[#111111]">
      <div className="w-full max-w-xl rounded-3xl border border-[#E4E4E4] bg-white p-8">
        <img src={globalxtremeLogo} alt="GlobalXtreme" width={597} height={103} className="h-auto w-44" />
        <p className="mt-8 inline-flex rounded-full bg-[#FFC7C4] px-3 py-2 text-[10px] font-black uppercase tracking-[.22em]">
          Database not connected
        </p>
        <h1 className="mt-4 text-3xl font-black tracking-[-.04em]">
          {missing ? "Firebase settings are missing" : denied ? "Firestore blocked access" : "Could not reach Firestore"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#666666]">
          {missing
            ? "Add the six VITE_FIREBASE_* environment variables in Vercel → Project → Settings → Environment Variables, then redeploy."
            : denied
              ? "Open Firebase Console → Firestore Database → Rules, paste the contents of firestore.rules, and publish."
              : `Check the Firebase project settings and your connection. Error: ${error}`}
        </p>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */

export default function App() {
  const {
    performances,
    judges,
    scores: allScores,
    goldenTicketId,
    topFiveIds,
    topFiveIsManual,
    event,
    error,
  } = useJudgingData();

  const [view, setView] = useState("dashboard");
  const [stage, setStage] = useState("Audition");
  const [judgeId, setJudgeId] = useState("");
  const [perfId, setPerfId] = useState("");
  const [form, setForm] = useState({ performanceQuality: 8, creativity: 8, entertainment: 8, stagePresence: 8 });
  const [notes, setNotes] = useState("");
  const [nominated, setNominated] = useState(false);
  const [pick, setPick] = useState("");
  const [toast, setToast] = useState("");
  const [pending, startTransition] = useTransition();

  const auditionScores = useMemo(() => allScores.filter((s) => s.stage === "Audition"), [allScores]);
  const auditionRows = useMemo(
    () => buildRows(performances, auditionScores, goldenTicketId),
    [performances, auditionScores, goldenTicketId]
  );
  const draftTop = auditionRows.filter((r) => r.performance.id === goldenTicketId || r.score > 0).slice(0, 5);
  const topIds = topFiveIsManual ? topFiveIds : draftTop.map((r) => r.performance.id);
  const finalists = topIds.map((id) => auditionRows.find((r) => r.performance.id === id)).filter((x) => !!x);
  const stagePerformances = stage === "Audition" ? performances : finalists.map((r) => r.performance);
  const stageJudges = judges.filter((j) => j.stage === stage && j.active);
  const stageScores = allScores.filter((s) => s.stage === stage);
  const rows = buildRows(stagePerformances, stageScores, stage === "Audition" ? goldenTicketId : null);
  const currentPerf = stagePerformances.find((p) => p.id === perfId) ?? stagePerformances[0];
  const currentJudgeId = stageJudges.some((j) => j.id === judgeId) ? judgeId : "";
  const liveScore = computeFinalScore(form);
  const judgeProgress = currentJudgeId ? stageScores.filter((s) => s.judgeId === currentJudgeId).length : 0;
  const fullyScored = rows.filter((r) => r.judgeCount === stageJudges.length && stageJudges.length > 0).length;
  const scoredRows = rows.filter((r) => r.judgeCount);
  const averageScore = scoredRows.length ? scoredRows.reduce((t, r) => t + r.score, 0) / scoredRows.length : 0;
  // Golden Ticket rule: judges may say YES to several performances, but the one
  // Golden Ticket can only go to a performance with YES from every active Audition judge.
  const auditionPanel = judges.filter((j) => j.stage === "Audition" && j.active);
  const nominations = auditionRows
    .map((r) => {
      const yesIds = new Set(
        auditionScores.filter((s) => s.performanceId === r.performance.id && s.nominated).map((s) => s.judgeId)
      );
      const yesJudges = auditionPanel.filter((j) => yesIds.has(j.id));
      return {
        ...r,
        yesJudges,
        waitingFor: auditionPanel.filter((j) => !yesIds.has(j.id)),
        eligible: auditionPanel.length > 0 && yesJudges.length === auditionPanel.length,
      };
    })
    .filter((r) => r.yesJudges.length)
    .sort((a, b) => b.eligible - a.eligible || b.yesJudges.length - a.yesJudges.length || b.score - a.score);
  const eligibleCount = nominations.filter((r) => r.eligible).length;
  const awarded = nominations.find((r) => r.performance.id === goldenTicketId);
  const awardedStillEligible = !goldenTicketId || Boolean(awarded?.eligible);

  const nav =
    stage === "Audition"
      ? [
          ["dashboard", "Dashboard"],
          ["scoring-audition", "Scoring Audition"],
          ["leaderboard", "Leaderboard Audition"],
          ["ticket", "Golden Ticket"],
          ["top5", "Top 5 Curation"],
          ["history", "History"],
          ["manage", "Settings"],
        ]
      : [
          ["dashboard", "Dashboard"],
          ["scoring-final", "Scoring Top 5 Final"],
          ["leaderboard", "Leaderboard Top 5"],
          ["history", "History"],
          ["manage", "Settings"],
        ];

  function openStage(nextStage, nextView = view) {
    setStage(nextStage);
    setJudgeId("");
    setPerfId("");
    setView(nextView);
    setNominated(false);
  }
  function notify(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }
  function awardTicket(id) {
    if (id && !nominations.find((r) => r.performance.id === id)?.eligible) {
      notify(`Golden Ticket needs YES from all ${auditionPanel.length} Audition judges.`);
      return;
    }
    startTransition(async () => {
      await setGoldenTicket(id);
      notify(id ? "Golden Ticket awarded." : "Golden Ticket revoked.");
    });
  }
  function updateTopFive(ids) {
    startTransition(async () => {
      const r = await setTopFivePerformances(ids);
      if (r.ok) {
        setPick("");
        notify("Top 5 selection updated.");
      } else notify(r.error ?? "Could not update the Top 5.");
    });
  }
  function submitScore() {
    if (!currentJudgeId || !currentPerf) return;
    startTransition(async () => {
      const r = await saveScore({
        judgeId: currentJudgeId,
        performanceId: currentPerf.id,
        stage,
        performanceQuality: form.performanceQuality,
        creativity: form.creativity,
        entertainment: form.entertainment,
        stagePresence: form.stagePresence,
        notes,
        nominated: stage === "Audition" && nominated,
      });
      r.ok
        ? notify(`Score for ${currentPerf.code} ${currentPerf.name} saved — ${Number(r.score).toFixed(1)}`)
        : notify(r.error ?? "Could not save the score.");
    });
  }
  function editScore(s) {
    openStage(s.stage, scoringViewFor(s.stage));
    setJudgeId(s.judgeId);
    setPerfId(s.performanceId);
    setForm({
      performanceQuality: s.performanceQuality,
      creativity: s.creativity,
      entertainment: s.entertainment,
      stagePresence: s.stagePresence,
    });
    setNotes(s.notes ?? "");
    setNominated(Boolean(s.nominated));
    notify("Editing saved score. Adjust it, then press Save score.");
  }
  function removeScore(id) {
    startTransition(async () => {
      const r = await deleteScore(id);
      r.ok ? notify("Score deleted. Results recalculated.") : notify(r.error ?? "Could not delete the score.");
    });
  }

  const finalJudgeCount = judges.filter((j) => j.stage === "Top 5 Final" && j.active).length;
  const auditionJudgeCount = judges.filter((j) => j.stage === "Audition" && j.active).length;

  if (error) return <ConnectionNotice error={error} />;

  return (
    <main className="min-h-screen bg-[#F8F8F5] text-[#111111]">
      <div className="h-1.5 bg-[#FFEC6B]" />
      <header className="sticky top-0 z-40 border-b border-[#E4E4E4] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-4 py-4 max-[480px]:flex-col max-[480px]:items-stretch sm:px-5 lg:px-10">
          <button onClick={() => setView("dashboard")} className="flex items-center gap-4 text-left max-[480px]:justify-center">
            <img src={globalxtremeLogo} alt="GlobalXtreme" width={597} height={103} className="h-auto w-28 sm:w-44" />
            <span className="hidden h-8 w-px bg-[#E4E4E4] sm:block" />
            <span className="hidden sm:block">
              <span className="block text-[9px] font-bold uppercase tracking-[.24em] text-[#777777]">{event.eventLabel}</span>
              <span className="mt-1 block text-sm font-black uppercase tracking-tight">{event.appTitle}</span>
            </span>
          </button>
          <div className="flex justify-center rounded-full border border-[#E4E4E4] bg-[#F8F8F5] p-1">
            {["Audition", "Top 5 Final"].map((s) => (
              <button
                key={s}
                onClick={() => {
                  if (isScoringView(view)) openStage(s, scoringViewFor(s));
                  else if (s === "Top 5 Final" && (view === "ticket" || view === "top5")) openStage(s, "dashboard");
                  else openStage(s, view);
                }}
                className={`flex-1 rounded-full px-2 py-2 text-[9px] font-black uppercase tracking-wider transition sm:flex-none sm:px-4 sm:text-[10px] ${
                  stage === s ? "bg-[#111111] text-white" : "text-[#777777]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        {view !== "dashboard" && (
          <nav className="mx-auto flex max-w-[1480px] overflow-x-auto px-3 sm:px-5 lg:px-10">
            {nav.map(([key, label], i) => (
              <button
                key={key}
                onClick={() => {
                  if (key === "scoring-audition") openStage("Audition", key);
                  else if (key === "scoring-final") openStage("Top 5 Final", key);
                  else setView(key);
                }}
                className={`relative shrink-0 px-3 py-3 text-[9px] font-extrabold uppercase tracking-[.06em] lg:px-2.5 lg:py-4 lg:text-[11px] lg:tracking-[.05em] xl:px-4 xl:text-xs xl:tracking-[.1em] ${
                  view === key ? "text-[#111111]" : "text-[#777777] hover:text-[#111111]"
                }`}
              >
                <span className="mr-1 text-[8px] opacity-40 lg:mr-1.5 lg:text-[9px] xl:mr-2 xl:text-[10px]">0{i + 1}</span>
                {label}
                {view === key && <span className="absolute inset-x-3 bottom-0 h-0.5 bg-[#FFEC6B]" />}
              </button>
            ))}
          </nav>
        )}
      </header>

      <div className="mx-auto max-w-[1480px] px-4 py-7 sm:px-5 sm:py-8 lg:px-10 lg:py-10">
        {view === "dashboard" && (
          <Dashboard
            event={event}
            judges={judges}
            performances={performances}
            auditionComplete={auditionRows.filter((r) => r.judgeCount === auditionJudgeCount).length}
            finalComplete={
              buildRows(
                finalists.map((r) => r.performance),
                allScores.filter((s) => s.stage === "Top 5 Final"),
                null
              ).filter((r) => r.judgeCount === finalJudgeCount).length
            }
            goldenTicketName={auditionRows.find((r) => r.performance.id === goldenTicketId)?.performance.name}
            finalistCount={finalists.length}
            onOpen={(s) => openStage(s, scoringViewFor(s))}
            onManage={() => setView("manage")}
          />
        )}

        {isScoringView(view) && (
          <section>
            <PageTitle
              eyebrow={`${stage} · Scoring`}
              title={stage === "Audition" ? "JUDGING DESK" : "FINAL STAGE"}
              copy={
                stage === "Audition"
                  ? "Score every audition performance and nominate a Golden Ticket candidate."
                  : "A fresh score for the five finalists. Audition scores do not carry into the final."
              }
            />
            {stage !== "Top 5 Final" || stagePerformances.length ? (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_390px]">
                <div className="space-y-6">
                  <div className="grid gap-4 rounded-3xl border border-[#E4E4E4] bg-white p-5 sm:grid-cols-2">
                    <Field label="Judge">
                      <select value={currentJudgeId} onChange={(e) => setJudgeId(e.target.value)} className="field">
                        <option value="">Select a judge</option>
                        {stageJudges.map((j) => (
                          <option key={j.id} value={j.id}>
                            {j.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Performance">
                      <select value={currentPerf?.id ?? ""} onChange={(e) => setPerfId(e.target.value)} className="field">
                        {stagePerformances.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.code} · {p.slotTime ? `${p.slotTime} · ` : ""}
                            {p.name} · {p.details || p.category}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  {currentPerf && <PerformanceCard performance={currentPerf} />}

                  <div className="rounded-3xl border border-[#E4E4E4] bg-white p-6">
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[.2em] text-[#777777]">Section 02</p>
                        <h2 className="mt-2 text-2xl font-black">Scoring</h2>
                      </div>
                      <p className="text-xs text-[#777777]">Scale 1–10</p>
                    </div>
                    <div className="divide-y divide-[#E4E4E4]">
                      {CRITERIA.map((c) => (
                        <div
                          key={c.key}
                          className="grid gap-4 py-5 md:grid-cols-[minmax(0,1fr)_minmax(240px,.8fr)_48px] md:items-center"
                        >
                          <div>
                            <div className="flex items-center gap-3">
                              <span className={`grid size-9 place-items-center rounded-lg text-[10px] font-black ${c.tone}`}>
                                {c.short}
                              </span>
                              <p className="font-bold">
                                {c.label} <span className="ml-1 text-xs text-[#777777]">{c.weight}</span>
                              </p>
                            </div>
                            <p className="ml-12 mt-1 text-xs text-[#777777]">{c.help}</p>
                          </div>
                          <input
                            aria-label={c.label}
                            type="range"
                            min="1"
                            max="10"
                            value={form[c.key]}
                            onChange={(e) => setForm({ ...form, [c.key]: Number(e.target.value) })}
                            className="score-range w-full"
                          />
                          <span className="text-center text-2xl font-black tabular-nums">{form[c.key]}</span>
                        </div>
                      ))}
                    </div>
                    <Field label="Judge notes (optional)">
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add highlights, considerations, or feedback…"
                        className="field mt-2 min-h-28 resize-none"
                      />
                    </Field>
                  </div>
                </div>

                <aside className="lg:sticky lg:top-36 lg:self-start">
                  <div className="overflow-hidden rounded-3xl border border-[#E4E4E4] bg-white shadow-xl shadow-black/5">
                    <div className="border-b border-[#E4E4E4] bg-[#FFF0A6] p-6">
                      <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#666666]">Live score</p>
                      <div className="mt-3 flex items-end justify-between">
                        <span className="text-6xl font-black tracking-[-.06em]">{liveScore.toFixed(1)}</span>
                        <span className="pb-2 text-sm font-bold text-[#777777]">/ 100</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 divide-x divide-[#E4E4E4] border-b border-[#E4E4E4]">
                      {CRITERIA.map((c) => (
                        <div key={c.key} className="p-3 text-center">
                          <p className="text-[9px] font-black text-[#999999]">{c.short}</p>
                          <p className="mt-1 font-black">{form[c.key]}</p>
                        </div>
                      ))}
                    </div>
                    {stage === "Audition" && (
                      <div className="border-b border-[#E4E4E4] p-5">
                        <div className="flex items-start gap-3">
                          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#FFF0A6]">
                            <TicketIcon />
                          </span>
                          <div>
                            <p className="text-sm font-black">Golden Ticket?</p>
                            <p className="mt-1 text-xs leading-5 text-[#777777]">
                              Would you recommend this performance for the Golden Ticket? You can say Yes to more than one
                              performance. The one Golden Ticket goes only to a performance with Yes from all{" "}
                              {auditionPanel.length} Audition judges.
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setNominated(false)}
                            className={`rounded-xl border px-4 py-3 text-xs font-black uppercase tracking-wider ${
                              !nominated ? "border-[#111111] bg-[#111111] text-white" : "border-[#D8D8D8] bg-white text-[#777777]"
                            }`}
                          >
                            No
                          </button>
                          <button
                            type="button"
                            onClick={() => setNominated(true)}
                            className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-black uppercase tracking-wider ${
                              nominated ? "border-[#FFEC6B] bg-[#FFEC6B] text-[#111111]" : "border-[#D8D8D8] bg-white text-[#777777]"
                            }`}
                          >
                            {nominated && <CheckIcon />} Yes
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="p-5">
                      <div className="mb-4 flex items-center justify-between text-xs">
                        <span className="text-[#777777]">Judge progress</span>
                        <strong>
                          {judgeProgress} / {stagePerformances.length}
                        </strong>
                      </div>
                      <button
                        disabled={!currentJudgeId || !currentPerf || pending}
                        onClick={submitScore}
                        className="w-full rounded-xl bg-[#111111] px-5 py-4 text-sm font-black uppercase tracking-wider text-white disabled:opacity-30"
                      >
                        {pending ? "Saving…" : "Save score"}
                      </button>
                    </div>
                  </div>
                </aside>
              </div>
            ) : (
              <EmptyState title="Top 5 is not available yet" copy="Complete Audition scoring and award the Golden Ticket first." />
            )}
          </section>
        )}

        {view === "leaderboard" && (
          <section>
            <ResultsHero stage={stage} judgeCount={stageJudges.length} />
            <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Performances" value={String(stagePerformances.length)} />
              <StatCard label="Fully scored" value={`${fullyScored} / ${stagePerformances.length}`} />
              <StatCard label="Average score" value={averageScore ? averageScore.toFixed(1) : "—"} />
              <StatCard label="Active judges" value={String(stageJudges.length)} accent />
            </div>
            <Podium rows={rows} />
            <LeaderboardTable
              rows={rows}
              judgeTotal={stageJudges.length}
              goldenTicketId={stage === "Audition" ? goldenTicketId : null}
            />
          </section>
        )}

        {view === "ticket" && (
          <section>
            <PageTitle
              eyebrow="Audition · One pass to Main Stage"
              title="GOLDEN TICKET"
              copy={`One Golden Ticket. It can only be awarded to a performance that gets Yes from all ${auditionPanel.length} Audition judges.`}
            />
            <div
              className={`mb-7 flex flex-col justify-between gap-5 rounded-3xl border p-6 sm:flex-row sm:items-center ${
                goldenTicketId ? "border-[#FFEC6B] bg-[#FFEC6B]" : "border-[#E4E4E4] bg-white"
              }`}
            >
              <div className="flex items-center gap-4">
                <span
                  className={`grid size-14 place-items-center rounded-2xl ${
                    goldenTicketId ? "bg-[#111111] text-[#FFEC6B]" : "bg-[#FFF0A6]"
                  }`}
                >
                  <TicketIcon className="size-7" />
                </span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.22em] opacity-60">
                    {goldenTicketId ? "Golden Ticket · Awarded" : "Golden Ticket · 1 Available"}
                  </p>
                  <h2 className="mt-1 text-2xl font-black">
                    {auditionRows.find((r) => r.performance.id === goldenTicketId)?.performance.name ??
                      "Awaiting the judges’ decision"}
                  </h2>
                  {!awardedStillEligible && (
                    <p className="mt-2 text-xs font-bold text-[#A32222]">
                      No longer {auditionPanel.length}/{auditionPanel.length} Yes. A judge changed their vote. Review or revoke.
                    </p>
                  )}
                </div>
              </div>
              {goldenTicketId && (
                <button
                  onClick={() => awardTicket(null)}
                  disabled={pending}
                  className="rounded-xl border border-[#111111]/20 px-5 py-3 text-xs font-black uppercase"
                >
                  Revoke
                </button>
              )}
            </div>
            {eligibleCount > 1 && !goldenTicketId && (
              <div className="mb-5 rounded-2xl border border-[#B8CCFF] bg-[#EEF2FF] p-4 text-sm text-[#244785]">
                <strong>{eligibleCount} performances have Yes from all judges.</strong> There is only one Golden Ticket.
                They are sorted by audition score, highest first.
              </div>
            )}
            <div className="grid gap-4">
              {nominations.length ? (
                nominations.map((r) => (
                  <article
                    key={r.performance.id}
                    className={`rounded-3xl border bg-white p-6 ${r.eligible ? "border-[#185C28]/30" : "border-[#E4E4E4]"}`}
                  >
                    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black ${
                              r.eligible ? "bg-[#C5F3CE] text-[#185C28]" : "bg-[#FFF0A6]"
                            }`}
                          >
                            {r.yesJudges.length}/{auditionPanel.length} YES
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#777777]">
                            {r.eligible ? "Eligible for Golden Ticket" : "Nominated · not eligible yet"}
                          </span>
                        </div>
                        <h3 className="mt-4 text-xl font-black">
                          {r.performance.code} · {r.performance.name}
                        </h3>
                        <p className="mt-2 text-sm text-[#777777]">Yes from {r.yesJudges.map((j) => j.name).join(", ")}</p>
                        {!r.eligible && (
                          <p className="mt-1 text-xs text-[#999999]">
                            No Yes yet from {r.waitingFor.map((j) => j.name).join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-5">
                        <p className="text-3xl font-black">{r.score.toFixed(1)}</p>
                        <button
                          onClick={() => awardTicket(r.performance.id)}
                          disabled={!!goldenTicketId || pending || !r.eligible}
                          className="rounded-xl bg-[#FFEC6B] px-5 py-3.5 text-xs font-black uppercase disabled:opacity-30"
                        >
                          {r.eligible ? "Award Ticket" : `Needs ${auditionPanel.length}/${auditionPanel.length} Yes`}
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState
                  icon={<TicketIcon className="size-8" />}
                  title="No nominations yet"
                  copy="Nominations can be made from the Audition scoring form."
                />
              )}
            </div>
          </section>
        )}

        {view === "top5" && (
          <section>
            <PageTitle
              eyebrow={event.top5Date}
              title="TOP 5 CURATION"
              copy="Choose any five performances for the final stage. You can add, remove, and replace finalists at any time."
            />
            <div className="mb-7 rounded-2xl border border-[#B8CCFF] bg-[#EEF2FF] p-4 text-sm text-[#244785]">
              <strong>Main Stage:</strong> scored fresh by {finalJudgeCount} final-stage judges.
            </div>
            <div className="mb-7 rounded-3xl border border-[#E4E4E4] bg-white p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#777777]">Finalist manager</p>
                  <h2 className="mt-2 text-xl font-black">{finalists.length} of 5 slots selected</h2>
                  <p className="mt-1 text-xs leading-5 text-[#777777]">
                    {topFiveIsManual
                      ? "Manual selection is active. Changes are saved for every connected user."
                      : "Showing the audition ranking as a draft. Your first edit will save a manual selection."}
                  </p>
                </div>
                <span
                  className={`w-fit rounded-full px-3 py-2 text-[9px] font-black uppercase tracking-wider ${
                    finalists.length === 5 ? "bg-[#C5F3CE] text-[#185C28]" : "bg-[#FFF0A6] text-[#6A5400]"
                  }`}
                >
                  {finalists.length === 5 ? "Ready for final" : `${5 - finalists.length} slots open`}
                </span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <select
                  className="field"
                  value={pick}
                  onChange={(e) => setPick(e.target.value)}
                  disabled={finalists.length >= 5 || pending}
                >
                  <option value="">Choose a performance to add</option>
                  {performances
                    .filter((p) => !topIds.includes(p.id))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} · {p.name} · {divisionLabel(p)}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  disabled={!pick || finalists.length >= 5 || pending}
                  onClick={() => updateTopFive([...topIds, pick])}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#111111] px-6 py-3 text-xs font-black uppercase tracking-wider text-white disabled:opacity-30"
                >
                  <PlusIcon /> Add finalist
                </button>
              </div>
            </div>
            {finalists.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {finalists.map((r, i) => (
                  <article
                    key={r.performance.id}
                    className={`relative overflow-hidden rounded-3xl border p-5 ${
                      r.performance.id === goldenTicketId ? "border-[#FFEC6B] bg-[#FFEC6B]" : "border-[#E4E4E4] bg-white"
                    }`}
                  >
                    <p className="text-[10px] font-black uppercase tracking-[.18em] opacity-45">Slot {i + 1}</p>
                    {r.performance.id === goldenTicketId && (
                      <div className="absolute right-4 top-4">
                        <TicketIcon />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => updateTopFive(topIds.filter((id) => id !== r.performance.id))}
                      disabled={pending}
                      className="absolute right-4 top-12 rounded-full border border-current/15 bg-white/70 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider backdrop-blur disabled:opacity-30"
                    >
                      Remove
                    </button>
                    <div className="mt-12">
                      <p className="text-xs font-bold opacity-50">{r.performance.code}</p>
                      <h3 className="mt-1 text-xl font-black leading-tight">{r.performance.name}</h3>
                      <p className="mt-3 text-xs opacity-55">{categoryLabel(r.performance.category)}</p>
                      <p className="mt-2 text-[11px] font-bold leading-4 opacity-70">{divisionLabel(r.performance)}</p>
                      <div className="mt-6 border-t border-current/10 pt-4">
                        <p className="text-[10px] uppercase tracking-wider opacity-45">Audition score</p>
                        <p className="mt-1 text-3xl font-black">{r.score ? r.score.toFixed(1) : "GT"}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState title="No finalists selected" copy="Use the selector above to add any performance to the Top 5." />
            )}
            <div className="mt-8 flex justify-end">
              <button
                onClick={() => openStage("Top 5 Final", "scoring-final")}
                disabled={finalists.length < 5}
                className="rounded-xl bg-[#111111] px-6 py-4 text-xs font-black uppercase tracking-wider text-white disabled:opacity-30"
              >
                Open Final Scoring
              </button>
            </div>
          </section>
        )}

        {view === "history" && (
          <History
            scores={stageScores}
            performances={performances}
            stage={stage}
            pending={pending}
            onAdd={() => openStage(stage, scoringViewFor(stage))}
            onEdit={editScore}
            onDelete={removeScore}
            onExport={() =>
              import("./exportExcel.js").then((m) =>
                m.exportExcel({
                  performances,
                  judges,
                  scores: allScores,
                  auditionRows,
                  finalists,
                  topFiveIsManual,
                })
              )
            }
          />
        )}

        {view === "manage" && <Settings event={event} judges={judges} performances={performances} onSaved={notify} />}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-[#E4E4E4] bg-white px-5 py-3 text-sm font-bold shadow-2xl">
          {toast}
        </div>
      )}
    </main>
  );
}
