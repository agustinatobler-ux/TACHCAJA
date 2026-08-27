export type Status = "green" | "amber" | "red" | "neutral";

export const STATUS_LABEL: Record<Status, string> = {
  green: "En objetivo",
  amber: "Atención",
  red: "Fuera de objetivo",
  neutral: "Sin objetivo",
};

export const STATUS_CLASS: Record<Status, string> = {
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
  neutral: "bg-neutral-50 text-neutral-500 border-neutral-200",
};

export function roasStatus(actualRoas: number, targetRoas: number | null): Status {
  if (!targetRoas) return "neutral";
  if (actualRoas >= targetRoas) return "green";
  if (actualRoas >= targetRoas * 0.85) return "amber";
  return "red";
}

export function cpaStatus(actualCpa: number, conversions: number, targetCpa: number | null): Status {
  if (!targetCpa) return "neutral";
  if (conversions === 0) return "red";
  if (actualCpa <= targetCpa) return "green";
  if (actualCpa <= targetCpa * 1.2) return "amber";
  return "red";
}

export function paceStatus(spend: number, monthlyBudget: number | null, dayOfMonth: number, daysInMonth: number): Status {
  if (!monthlyBudget) return "neutral";
  const expected = monthlyBudget * (dayOfMonth / daysInMonth);
  if (expected === 0) return "neutral";
  const ratio = spend / expected;
  if (ratio <= 1.1) return "green";
  if (ratio <= 1.25) return "amber";
  return "red";
}

export function pacePercentLabel(spend: number, monthlyBudget: number | null, dayOfMonth: number, daysInMonth: number) {
  if (!monthlyBudget) return null;
  const expected = monthlyBudget * (dayOfMonth / daysInMonth);
  if (expected === 0) return null;
  const diff = ((spend - expected) / expected) * 100;
  const sign = diff >= 0 ? "+" : "";
  return `${sign}${diff.toFixed(0)}% vs ritmo esperado`;
}
