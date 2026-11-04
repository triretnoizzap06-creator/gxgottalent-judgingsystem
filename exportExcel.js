import * as XLSX from "xlsx";
import { buildRows, categoryLabel, divisionLabel } from "./App.jsx";

// Same 4 sheets and columns as the original /export.xlsx
export function exportExcel({ performances, judges, scores, auditionRows, finalists, topFiveIsManual }) {
  const perfById = new Map(performances.map((p) => [p.id, p]));
  const judgeById = new Map(judges.map((j) => [j.id, j]));
  const auditionJudges = judges.filter((j) => j.stage === "Audition" && j.active).length;
  const finalJudges = judges.filter((j) => j.stage === "Top 5 Final" && j.active).length;

  const finalRows = buildRows(
    finalists.map((r) => r.performance),
    scores.filter((s) => s.stage === "Top 5 Final"),
    null
  );
  const results = [
    ["Stage", "Rank", "Code", "Performance", "Division", "Average Score", "Judge Count"],
    ...auditionRows
      .filter((r) => r.judgeCount)
      .map((r, i) => ["Audition", i + 1, r.performance.code, r.performance.name, divisionLabel(r.performance), round(r.score), `${r.judgeCount}/${auditionJudges}`]),
    ...finalRows
      .filter((r) => r.judgeCount)
      .map((r, i) => ["Top 5 Final", i + 1, r.performance.code, r.performance.name, divisionLabel(r.performance), round(r.score), `${r.judgeCount}/${finalJudges}`]),
  ];

  const performers = [
    ["Code", "Performance", "Title", "Category", "Format", "Division", "Performer Count", "Performers", "PIC", "Session", "Slot Time", "Standby", "Performance Details"],
    ...performances.map((p) => [
      p.code,
      p.name,
      p.title,
      categoryLabel(p.category),
      p.format === "Individu" ? "Individual" : p.format === "Grup" ? "Group" : p.format,
      divisionLabel(p),
      p.performerCount,
      (p.performers ?? []).map((x) => x.name).join(", "),
      p.pic,
      p.session ?? "",
      p.slotTime ?? "",
      p.standbyTime ?? "",
      p.details ?? "",
    ]),
  ];

  const history = [
    ["Submitted At", "Stage", "Judge", "Code", "Performance", "Division", "Performance Quality", "Creativity", "Entertainment", "Stage Presence", "Final Score", "Golden Ticket Nomination", "Notes"],
    ...[...scores]
      .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")))
      .map((s) => {
        const p = perfById.get(s.performanceId);
        return [
          s.createdAt
            ? new Date(s.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Makassar", dateStyle: "medium", timeStyle: "short" })
            : "",
          s.stage,
          judgeById.get(s.judgeId)?.name ?? s.judgeName ?? "",
          p?.code ?? "",
          p?.name ?? "Deleted performance",
          p ? divisionLabel(p) : "",
          s.performanceQuality,
          s.creativity,
          s.entertainment,
          s.stagePresence,
          round(s.finalScore),
          s.stage === "Audition" ? (s.nominated ? "Yes" : "No") : "",
          s.notes ?? "",
        ];
      }),
  ];

  const top5 = [
    ["Slot", "Code", "Performance", "Category", "Division", "Selection Mode"],
    ...finalists.map((r, i) => [
      i + 1,
      r.performance.code,
      r.performance.name,
      categoryLabel(r.performance.category),
      divisionLabel(r.performance),
      topFiveIsManual ? "Manual" : "Audition ranking (draft)",
    ]),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(results), "Final Results");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(performers), "Performers");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(history), "Score History");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(top5), "Top 5");
  XLSX.writeFile(wb, "export.xlsx");
}

function round(n) {
  return Math.round(Number(n) * 10) / 10;
}
