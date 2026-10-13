'use client';
import { useEffect, useState } from 'react';

/* ============================================================
   BLIND SCHOOL — Bulletins format officiel RDC
   ============================================================ */

export interface Subject {
  id: string;
  name: string;
}

export interface SubjectGroup {
  id: string;
  label: string;
  subjects: Subject[];
  maxPerPeriod: number;
}

export interface SemesterConfig {
  id: string;
  label: string;
  periods: { id: string; label: string }[];
  examLabel: string;
  examMax: number;
}

export interface BulletinTemplate {
  id: string;
  classe: string;
  option: string;
  title: string;
  semesterTitle: string;
  semesters: SemesterConfig[];
  groups: SubjectGroup[];
  showRepêchage: boolean;
  conduiteLabels: string[];
  updatedAt: string;
}

export interface Grade {
  id: string;
  studentId: string;
  subjectId: string;
  periodKey: string;
  points: number | null;
  updatedAt: string;
}

export interface ConduiteEntry {
  id: string;
  studentId: string;
  semesterId: string;
  value: string;
  updatedAt: string;
}

export interface EtablissementInfo {
  province: string;
  ecole: string;
  lieuImplantation: string;
  commune: string;
  ville: string;
  code: string;
  drapeau: string;
  armoiries: string;
  schoolLogo: string;
}

export interface BulletinConfig {
  etablissement: EtablissementInfo;
  passingPercent: number;
  appreciationRules: { min: number; label: string }[];
  decisionLabels: { passe: string; double: string; echoue: string };
}

export const STORAGE_KEYS = {
  templates: 'blind-school-bulletin-templates-v2',
  grades: 'blind-school-bulletin-grades-v2',
  conduite: 'blind-school-bulletin-conduite-v2',
  config: 'blind-school-bulletin-config-v2',
} as const;

export const DEFAULT_BULLETIN_CONFIG: BulletinConfig = {
  etablissement: {
    province: '',
    ecole: '',
    lieuImplantation: '',
    commune: '',
    ville: '',
    code: '',
    drapeau: '',
    armoiries: '',
    schoolLogo: '',
  },
  passingPercent: 50,
  appreciationRules: [
    { min: 80, label: 'Excellent' },
    { min: 70, label: 'Très bien' },
    { min: 60, label: 'Bien' },
    { min: 50, label: 'Passable' },
    { min: 40, label: 'Faible' },
    { min: 0,  label: 'Mauvais' },
  ],
  decisionLabels: { passe: 'Passe', double: 'Double', echoue: 'A échoué' },
};

/* ---------- Hook localStorage partagé ---------- */
function usePersistentState<T>(
  key: string,
  initial: T,
): [T, (v: T | ((p: T) => T)) => void] {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [key]);

  useEffect(() => {
    const onStore = (e: Event) => {
      const ce = e as CustomEvent<{ key: string; value: T }>;
      if (ce.detail?.key === key) setValue(ce.detail.value);
    };
    window.addEventListener('bs-store', onStore);
    return () => window.removeEventListener('bs-store', onStore);
  }, [key]);

  const set = (v: T | ((p: T) => T)) => {
    setValue((prev) => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v;
      try {
        localStorage.setItem(key, JSON.stringify(next));
        window.dispatchEvent(
          new CustomEvent('bs-store', { detail: { key, value: next } }),
        );
      } catch { /* ignore */ }
      return next;
    });
  };

  return [value, set];
}

export const useBulletinTemplates = () =>
  usePersistentState<BulletinTemplate[]>(STORAGE_KEYS.templates, []);
export const useGrades = () =>
  usePersistentState<Grade[]>(STORAGE_KEYS.grades, []);
export const useConduite = () =>
  usePersistentState<ConduiteEntry[]>(STORAGE_KEYS.conduite, []);
export const useBulletinConfig = () =>
  usePersistentState<BulletinConfig>(STORAGE_KEYS.config, DEFAULT_BULLETIN_CONFIG);

/* ---------- Helpers ---------- */
export const templateKey = (classe: string, option: string) =>
  `${classe}__${option || 'none'}`;

export const gradeKey = (studentId: string, subjectId: string, periodKey: string) =>
  `${studentId}__${subjectId}__${periodKey}`;

export function appreciationFor(
  pct: number,
  rules: BulletinConfig['appreciationRules'],
): string {
  const sorted = [...rules].sort((a, b) => b.min - a.min);
  return sorted.find((r) => pct >= r.min)?.label || '—';
}

/* ---------- Structure par défaut ---------- */
export const DEFAULT_SEMESTERS: SemesterConfig[] = [
  {
    id: 'S1',
    label: 'PREMIER SEMESTRE',
    periods: [
      { id: 'P1', label: '1°P' },
      { id: 'P2', label: '2°P' },
    ],
    examLabel: 'EXAM',
    examMax: 0,
  },
  {
    id: 'S2',
    label: 'SECOND SEMESTRE',
    periods: [
      { id: 'P3', label: '3°P' },
      { id: 'P4', label: '4°P' },
    ],
    examLabel: 'EXAM',
    examMax: 0,
  },
];

export function makeDefaultTemplate(classe: string, option: string, title: string): BulletinTemplate {
  const uid = () => `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const groups: SubjectGroup[] = [
    {
      id: uid(),
      label: '',
      maxPerPeriod: 10,
      subjects: [
        { id: uid(), name: 'Religion' },
        { id: uid(), name: 'Education à la vie' },
        { id: uid(), name: 'Education à la citoyenneté' },
        { id: uid(), name: 'Education physique' },
        { id: uid(), name: 'Géographie(Economique)' },
        { id: uid(), name: 'Droit' },
      ],
    },
    {
      id: uid(),
      label: '',
      maxPerPeriod: 20,
      subjects: [
        { id: uid(), name: 'Mathématiques générales' },
        { id: uid(), name: 'Mathématique financières' },
        { id: uid(), name: 'Fiscalité' },
        { id: uid(), name: 'Correspondance com. Française' },
        { id: uid(), name: 'Correspondance com. Anglaise' },
        { id: uid(), name: 'Activité complémentaires' },
      ],
    },
    {
      id: uid(),
      label: '',
      maxPerPeriod: 30,
      subjects: [
        { id: uid(), name: 'Anglais' },
        { id: uid(), name: 'Documentation commerciale' },
      ],
    },
    {
      id: uid(),
      label: '',
      maxPerPeriod: 40,
      subjects: [
        { id: uid(), name: 'Français' },
        { id: uid(), name: 'Informatique' },
      ],
    },
    {
      id: uid(),
      label: '',
      maxPerPeriod: 60,
      subjects: [
        { id: uid(), name: 'Comptabilité générale' },
      ],
    },
  ];

  return {
    id: templateKey(classe, option),
    classe,
    option,
    title: title || `BULLETIN DE LA ${classe.toUpperCase()}`,
    semesterTitle: 'ANNEE SCOLAIRE',
    semesters: DEFAULT_SEMESTERS,
    groups,
    showRepêchage: true,
    conduiteLabels: ['A', 'B', 'C', 'D'],
    updatedAt: new Date().toISOString(),
  };
}

/* ============================================================
   CALCULS DES MAXIMA
   ============================================================ */

export interface GroupTotals {
  group: SubjectGroup;
  maxPerPeriod: number;
  maxSemester: { semesterId: string; total: number; examMax: number; maxTotal: number }[];
  grandMax: number;
}

/** Calcule le max d'une période = somme sur tous les groupes (maxPerPeriod × nb de branches) */
export function getPeriodMax(tpl: BulletinTemplate): number {
  return tpl.groups.reduce(
    (s, g) => s + g.maxPerPeriod * g.subjects.length,
    0,
  );
}

/** L'examen vaut 2× le max d'une période */
export function getExamMax(tpl: BulletinTemplate): number {
  return getPeriodMax(tpl) * 2;
}

export function computeGroupMaxima(tpl: BulletinTemplate): GroupTotals[] {
  const examMax = getExamMax(tpl);
  return tpl.groups.map((g) => {
    const maxSemester = tpl.semesters.map((sem) => {
      const periodsTotal = g.maxPerPeriod * sem.periods.length;
      // part de l'examen pour ce groupe = maxPerPeriod × 2 × nb branches
      const examForGroup = g.maxPerPeriod * 2 * g.subjects.length;
      return {
        semesterId: sem.id,
        total: periodsTotal * g.subjects.length,
        examMax: examForGroup,
        maxTotal: periodsTotal * g.subjects.length + examForGroup,
      };
    });
    const grandMax = maxSemester.reduce((s, x) => s + x.maxTotal, 0);
    return { group: g, maxPerPeriod: g.maxPerPeriod, maxSemester, grandMax };
  });
}

export function grandMaxima(tpl: BulletinTemplate): number {
  return computeGroupMaxima(tpl).reduce((s, g) => s + g.grandMax, 0);
}

/* ============================================================
   LIGNES PAR BRANCHE
   ============================================================ */

export interface SubjectRow {
  subject: Subject;
  groupId: string;
  maxPerPeriod: number;
  periods: Record<string, number | null>;
  semesterTotals: Record<string, number>;
  grandTotal: number;
  repechage: number | null;
}

export function computeSubjectRow(
  subject: Subject,
  group: SubjectGroup,
  tpl: BulletinTemplate,
  studentId: string,
  grades: Grade[],
): SubjectRow {
  const periods: Record<string, number | null> = {};
  const semesterTotals: Record<string, number> = {};
  let grandTotal = 0;

  tpl.semesters.forEach((sem) => {
    let semesterTotal = 0;
    sem.periods.forEach((p) => {
      const key = `${sem.id}__${p.id}`;
      const g = grades.find(
        (x) => x.studentId === studentId && x.subjectId === subject.id && x.periodKey === key,
      );
      const pts = g?.points ?? null;
      periods[key] = pts;
      if (pts !== null) semesterTotal += pts;
    });
    const examKey = `${sem.id}__EXAM`;
    const examGrade = grades.find(
      (x) => x.studentId === studentId && x.subjectId === subject.id && x.periodKey === examKey,
    );
    const examPts = examGrade?.points ?? null;
    periods[examKey] = examPts;
    if (examPts !== null) semesterTotal += examPts;

    semesterTotals[sem.id] = semesterTotal;
    grandTotal += semesterTotal;
  });

  const repKey = `REPECHAGE`;
  const repG = grades.find(
    (x) => x.studentId === studentId && x.subjectId === subject.id && x.periodKey === repKey,
  );
  const repechage = repG?.points ?? null;

  return {
    subject,
    groupId: group.id,
    maxPerPeriod: group.maxPerPeriod,
    periods,
    semesterTotals,
    grandTotal,
    repechage,
  };
}

/* ============================================================
   BULLETIN D'UN ÉLÈVE
   ============================================================ */

/** Total d'un élève pour une période donnée. Renvoie null si au moins une branche manque. */
function computePeriodStudentTotal(
  tpl: BulletinTemplate,
  grades: Grade[],
  studentId: string,
  periodKey: string,
): number | null {
  const allSubjects = tpl.groups.flatMap((g) => g.subjects);
  let total = 0;
  for (const sub of allSubjects) {
    const g = grades.find(
      (x) => x.studentId === studentId && x.subjectId === sub.id && x.periodKey === periodKey,
    );
    if (g?.points === null || g?.points === undefined) return null;
    total += g.points;
  }
  return total;
}

export interface StudentBulletinData {
  studentId: string;
  rows: SubjectRow[];
  groupTotals: Record<string, { semester: Record<string, number>; grand: number }>;
  grandMaxima: number;
  studentTotal: number;
  percent: number;
  appreciation: string;
  decision: 'Passe' | 'Double' | 'A échoué' | 'En cours';
  conduite: Record<string, string>;

  isComplete: boolean;
  tgTotal: number | null;
  tgPercent: number | null;
  periodStudentTotals: Record<string, number | null>;
  periodPercentages: Record<string, number | null>;
  semesterTotals: Record<string, { total: number; max: number; percent: number | null }>;
}

export function computeStudentBulletin(
  studentId: string,
  tpl: BulletinTemplate,
  grades: Grade[],
  conduite: ConduiteEntry[],
  config: BulletinConfig,
): StudentBulletinData {
  const rows: SubjectRow[] = [];
  const groupTotals: Record<string, { semester: Record<string, number>; grand: number }> = {};

  tpl.groups.forEach((g) => {
    const groupSem: Record<string, number> = {};
    tpl.semesters.forEach((sem) => (groupSem[sem.id] = 0));
    let groupGrand = 0;
    g.subjects.forEach((sub) => {
      const row = computeSubjectRow(sub, g, tpl, studentId, grades);
      rows.push(row);
      tpl.semesters.forEach((sem) => {
        groupSem[sem.id] += row.semesterTotals[sem.id] || 0;
      });
      groupGrand += row.grandTotal;
    });
    groupTotals[g.id] = { semester: groupSem, grand: groupGrand };
  });

  const studentTotal = rows.reduce((s, r) => s + r.grandTotal, 0);
  const max = grandMaxima(tpl);
  const percent = max > 0 ? (studentTotal / max) * 100 : 0;

  /* ---------- Progression par période ---------- */
  const periodMax = getPeriodMax(tpl);
  const examMax = getExamMax(tpl);
  const periodStudentTotals: Record<string, number | null> = {};
  const periodPercentages: Record<string, number | null> = {};

  tpl.semesters.forEach((sem) => {
    sem.periods.forEach((p) => {
      const key = `${sem.id}__${p.id}`;
      const total = computePeriodStudentTotal(tpl, grades, studentId, key);
      periodStudentTotals[key] = total;
      periodPercentages[key] =
        total === null || periodMax === 0 ? null : (total / periodMax) * 100;
    });
    const examKey = `${sem.id}__EXAM`;
    const examTotal = computePeriodStudentTotal(tpl, grades, studentId, examKey);
    periodStudentTotals[examKey] = examTotal;
    periodPercentages[examKey] =
      examTotal === null || examMax === 0 ? null : (examTotal / examMax) * 100;
  });

  /* ---------- Totaux par semestre ---------- */
  const semesterTotals: StudentBulletinData['semesterTotals'] = {};
  tpl.semesters.forEach((sem) => {
    const periodSum = sem.periods.reduce(
      (s, p) => s + (periodStudentTotals[`${sem.id}__${p.id}`] ?? 0),
      0,
    );
    const examVal = periodStudentTotals[`${sem.id}__EXAM`] ?? 0;
    const semTotal = periodSum + examVal;

    const allPeriodsDone = sem.periods.every(
      (p) => periodStudentTotals[`${sem.id}__${p.id}`] !== null,
    );
    const examDone = periodStudentTotals[`${sem.id}__EXAM`] !== null;
    const semMax = periodMax * sem.periods.length + examMax;

    semesterTotals[sem.id] = {
      total: semTotal,
      max: semMax,
      percent:
        allPeriodsDone && examDone && semMax > 0
          ? (semTotal / semMax) * 100
          : null,
    };
  });

  /* ---------- Complétude globale ---------- */
  const isComplete = tpl.semesters.every((sem) => {
    const periodsDone = sem.periods.every(
      (p) => periodStudentTotals[`${sem.id}__${p.id}`] !== null,
    );
    const examDone = periodStudentTotals[`${sem.id}__EXAM`] !== null;
    return periodsDone && examDone;
  });

  const tgTotal = isComplete ? studentTotal : null;
  const tgPercent = isComplete ? percent : null;

  const decision: StudentBulletinData['decision'] = !isComplete
    ? 'En cours'
    : percent >= config.passingPercent
      ? 'Passe'
      : 'A échoué';

  const conduiteMap: Record<string, string> = {};
  tpl.semesters.forEach((sem) => {
    const c = conduite.find((x) => x.studentId === studentId && x.semesterId === sem.id);
    conduiteMap[sem.id] = c?.value || '';
  });

  return {
    studentId,
    rows,
    groupTotals,
    grandMaxima: max,
    studentTotal,
    percent,
    appreciation: appreciationFor(percent, config.appreciationRules),
    decision,
    conduite: conduiteMap,
    isComplete,
    tgTotal,
    tgPercent,
    periodStudentTotals,
    periodPercentages,
    semesterTotals,
  };
}

/* ============================================================
   CLASSEMENT
   ============================================================ */

export interface ClassBulletinRow {
  studentId: string;
  data: StudentBulletinData;
  rank: number;
}

export function buildClassBulletins(
  studentIds: string[],
  tpl: BulletinTemplate,
  grades: Grade[],
  conduite: ConduiteEntry[],
  config: BulletinConfig,
): ClassBulletinRow[] {
  const rows = studentIds.map((sid) => ({
    studentId: sid,
    data: computeStudentBulletin(sid, tpl, grades, conduite, config),
    rank: 0,
  }));
  const sorted = [...rows].sort((a, b) => b.data.percent - a.data.percent);
  sorted.forEach((r, i) => (r.rank = i + 1));
  for (let i = 1; i < sorted.length; i++) {
    if (Math.abs(sorted[i].data.percent - sorted[i - 1].data.percent) < 0.001) {
      sorted[i].rank = sorted[i - 1].rank;
    }
  }
  return rows;
}