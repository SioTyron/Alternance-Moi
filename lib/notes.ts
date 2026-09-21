// lib/notes.ts
// Types et calculs de moyennes pour le module Note Tracker.

export type Formation = {
  id: string;
  name: string;
  school: string | null;
  level: string | null;
  academic_year: string | null;
};

export type Grade = {
  id: string;
  ue_id: string;
  label: string | null;
  value: number;
  coefficient: number;
  created_at?: string;
};

export type UE = {
  id: string;
  formation_id: string;
  name: string;
  grades: Grade[];
};

/**
 * Moyenne d'une UE : moyenne pondérée des notes par coefficient.
 * Retourne null si l'UE n'a aucune note.
 */
export function ueAverage(grades: Grade[]): number | null {
  if (!grades || grades.length === 0) return null;
  const totalCoef = grades.reduce((sum, g) => sum + (Number(g.coefficient) || 1), 0);
  if (totalCoef === 0) return null;
  const weighted = grades.reduce((sum, g) => sum + Number(g.value) * (Number(g.coefficient) || 1), 0);
  return weighted / totalCoef;
}

/**
 * Moyenne générale : moyenne simple des moyennes d'UE
 * (chaque UE a le même poids). Les UE sans note sont ignorées.
 * Retourne null si aucune UE n'a de note.
 */
export function overallAverage(ues: { grades: Grade[] }[]): number | null {
  const averages = ues
    .map((ue) => ueAverage(ue.grades))
    .filter((a): a is number => a !== null);
  if (averages.length === 0) return null;
  return averages.reduce((sum, a) => sum + a, 0) / averages.length;
}

/**
 * Moyenne d'UE cumulée après chaque note (dans l'ordre chronologique).
 * Sert à tracer l'évolution de la moyenne de l'UE.
 */
export function runningAverages(grades: Grade[]): number[] {
  const sorted = [...grades].sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));
  const out: number[] = [];
  let weighted = 0;
  let totalCoef = 0;
  for (const g of sorted) {
    const c = Number(g.coefficient) || 1;
    weighted += Number(g.value) * c;
    totalCoef += c;
    out.push(totalCoef ? weighted / totalCoef : 0);
  }
  return out;
}

/** Formate une moyenne (/20) ou "—" si null. */
export function formatAverage(value: number | null): string {
  return value === null ? '—' : value.toFixed(2);
}

/** Couleur d'accent selon la note (/20). */
export function averageColor(value: number | null): string {
  if (value === null) return 'text-slate-400';
  if (value >= 14) return 'text-green-600';
  if (value >= 10) return 'text-blue-600';
  if (value >= 8) return 'text-amber-600';
  return 'text-red-600';
}
